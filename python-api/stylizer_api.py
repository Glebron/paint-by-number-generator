from flask import Flask, request, send_file
import cv2
import numpy as np
import os

app = Flask(__name__)

def stylize_image(image_path, output_path):
    img = cv2.imread(image_path)
    img = cv2.resize(img, (1024, int(img.shape[0] * 1024 / img.shape[1])))

    # === Step 1: Pre-boost for stronger segmentation ===
    img_boosted = cv2.convertScaleAbs(img, alpha=1.25, beta=15)

    # === Step 2: Preserve detail and smooth ===
    detail = cv2.edgePreservingFilter(img_boosted, flags=1, sigma_s=70, sigma_r=0.3)
    smooth = cv2.bilateralFilter(detail, d=7, sigmaColor=45, sigmaSpace=45)

    # === Step 3: Quantize with moderate K ===
    Z = smooth.reshape((-1, 3)).astype(np.float32)
    K = 9  # Slightly more detail than 8, but less messy than 12
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(Z, K, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
    quantized = centers[labels.flatten()].reshape(img.shape).astype(np.uint8)

    # === Step 4: Thin clean edges (optional) ===
    gray = cv2.cvtColor(smooth, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 60, 130)
    edges_inv = cv2.bitwise_not(edges)
    edges_bgr = cv2.cvtColor(edges_inv, cv2.COLOR_GRAY2BGR)

    # === Step 5: Final blend ===
    cartoon = cv2.bitwise_and(quantized, edges_bgr)

    cv2.imwrite(output_path, cartoon)

@app.route('/stylize', methods=['POST'])
def stylize():
    file = request.files.get('file')
    if not file:
        return 'No file uploaded', 400

    input_path = 'input.png'
    output_path = 'stylized.png'
    file.save(input_path)
    stylize_image(input_path, output_path)
    return send_file(output_path, mimetype='image/png')

if __name__ == '__main__':
    app.run(port=8001)
