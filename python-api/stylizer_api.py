from flask import Flask, request, send_file
import cv2
import numpy as np
import os
import zipfile

app = Flask(__name__)

def stylize_image(image_path, output_color_path, output_outline_path):
    img = cv2.imread(image_path)
    img = cv2.resize(img, (1024, int(img.shape[0] * 1024 / img.shape[1])))

    # === Step 1: Pre-boost for stronger segmentation ===
    img_boosted = cv2.convertScaleAbs(img, alpha=1.25, beta=15)

    # === Step 2: Preserve detail and smooth ===
    detail = cv2.edgePreservingFilter(img_boosted, flags=1, sigma_s=70, sigma_r=0.3)
    smooth = cv2.bilateralFilter(detail, d=9, sigmaColor=55, sigmaSpace=55)

    # === Step 3: Color Quantization ===
    Z = smooth.reshape((-1, 3)).astype(np.float32)
    K = 12  # More color detail
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(Z, K, None, criteria, 10, cv2.KMEANS_PP_CENTERS)
    quantized = centers[labels.flatten()].reshape(img.shape).astype(np.uint8)

    # === Step 4: Find Contours from quantized grayscale ===
    gray_quantized = cv2.cvtColor(quantized, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray_quantized, (3, 3), 0)
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # === Step 5a: Colored Reference Image ===
    cv2.imwrite(output_color_path, quantized)

    # === Step 5b: White canvas with black outlines ===
    white_canvas = np.ones_like(gray_quantized) * 255
    cv2.drawContours(white_canvas, contours, -1, (0,), thickness=2)
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
