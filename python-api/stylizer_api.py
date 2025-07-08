from flask import Flask, request, send_file
import cv2
import numpy as np
import os

app = Flask(__name__)

def stylize_image(image_path, output_path):
    img = cv2.imread(image_path)
    img = cv2.resize(img, (1024, int(img.shape[0] * 1024 / img.shape[1])))

    # === Step 1: Detail + smoothing ===
    detail = cv2.edgePreservingFilter(img, flags=1, sigma_s=90, sigma_r=0.4)
    smooth = cv2.bilateralFilter(detail, d=9, sigmaColor=50, sigmaSpace=50)

    # Optional: Slight brightness/contrast pop
    smooth = cv2.convertScaleAbs(smooth, alpha=1.1, beta=10)  # alpha: contrast, beta: brightness

    # === Step 2: Color quantization ===
    Z = smooth.reshape((-1, 3)).astype(np.float32)
    K = 6  # Fewer = cleaner paint-by-numbers
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(Z, K, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
    quantized = centers[labels.flatten()].reshape(img.shape).astype(np.uint8)

    # === Step 3: Edge detection (softer and thinner) ===
    gray = cv2.cvtColor(smooth, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 60, 120)  # softer
    # Optional: remove this if you don't want bold outlines
    # edges = cv2.dilate(edges, None, iterations=1)

    edges_inv = cv2.bitwise_not(edges)
    edges_bgr = cv2.cvtColor(edges_inv, cv2.COLOR_GRAY2BGR)

    # === Step 4: Blend (or skip for clean fill areas) ===
    cartoon = cv2.bitwise_and(quantized, edges_bgr)
    # cartoon = quantized  # 👈 Try this if you want zero outlines

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
