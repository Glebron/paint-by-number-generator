from flask import Flask, request, send_file
import cv2
import numpy as np
import os
import zipfile

app = Flask(__name__)

def stylize_image(image_path, output_color_path, output_outline_path):
    img = cv2.imread(image_path)
    img = cv2.resize(img, (1024, int(img.shape[0] * 1024 / img.shape[1])))

    # 🧽 Stylization steps
    img_boosted = cv2.convertScaleAbs(img, alpha=1.25, beta=15)
    detail = cv2.edgePreservingFilter(img_boosted, flags=1, sigma_s=70, sigma_r=0.3)
    smooth = cv2.bilateralFilter(detail, d=9, sigmaColor=55, sigmaSpace=55)

    # 🎨 K-means color quantization
    Z = smooth.reshape((-1, 3)).astype(np.float32)
    K = 12
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(Z, K, None, criteria, 10, cv2.KMEANS_PP_CENTERS)
    quantized = centers[labels.flatten()].reshape(img.shape).astype(np.uint8)

    # 🟡 Reduce opacity over white
    opacity = 0.35
    white_bg = np.ones_like(quantized, dtype=np.uint8) * 255
    blended = cv2.addWeighted(quantized, opacity, white_bg, 1 - opacity, 0)

    h, w = img.shape[:2]
    region_map = labels.reshape((h, w))
    white_canvas = np.ones((h, w), dtype=np.uint8) * 255
    placed_centers = []

    for region_id in range(K):
        mask = (region_map == region_id).astype(np.uint8) * 255
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < 10:
                continue  # ❌ Skip tiny regions

            simplified = cv2.approxPolyDP(cnt, epsilon=1.5, closed=True)

            if area >= 50:
                # ✅ Outline large and medium regions
                cv2.drawContours(white_canvas, [simplified], -1, (150), thickness=1)
                cv2.drawContours(blended, [simplified], -1, (180, 180, 180), thickness=1)

            # 🧠 Place number
            M = cv2.moments(simplified)
            if M["m00"] == 0:
                continue
            cX = int(M["m10"] / M["m00"])
            cY = int(M["m01"] / M["m00"])

            # ✅ Avoid overlapping labels
            too_close = any(np.hypot(px - cX, py - cY) < 20 for (px, py) in placed_centers)
            if too_close:
                continue

            placed_centers.append((cX, cY))
            label = str(region_id + 1)
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.26
            thickness = 1
            text_size, _ = cv2.getTextSize(label, font, font_scale, thickness)
            text_w, text_h = text_size
            cv2.putText(
                blended,
                label,
                (cX - text_w // 2, cY + text_h // 2),
                font,
                font_scale,
                (50, 50, 50),
                thickness,
                cv2.LINE_AA,
            )

    # 💾 Save results
    cv2.imwrite(output_color_path, blended)
    cv2.imwrite(output_outline_path, white_canvas)

@app.route('/stylize', methods=['POST'])
def stylize():
    file = request.files.get('file')
    if not file:
        return 'No file uploaded', 400

    input_path = 'input.png'
    output_color = 'output_colored.png'
    output_outline = 'output_outline.png'
    file.save(input_path)
    stylize_image(input_path, output_color, output_outline)

    zip_path = 'stylized_pack.zip'
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        zipf.write(output_color)
        zipf.write(output_outline)

    return send_file(zip_path, mimetype='application/zip', as_attachment=True)

if __name__ == '__main__':
    app.run(port=8001)
