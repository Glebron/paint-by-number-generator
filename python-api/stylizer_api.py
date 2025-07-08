
from flask import Flask, request, send_file
import cv2
import numpy as np
import os

app = Flask(__name__)

def stylize_image(image_path, output_path):
    img = cv2.imread(image_path)
    img = cv2.resize(img, (1024, int(img.shape[0] * 1024 / img.shape[1])))

    # Step 1: Detail preservation + smoothing
    detail = cv2.edgePreservingFilter(img, flags=1, sigma_s=60, sigma_r=0.4)
    blur = cv2.bilateralFilter(detail, 9, 75, 75)

    # Step 2: Edge detection
    gray = cv2.cvtColor(blur, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Laplacian(blurred, cv2.CV_8U, ksize=5)
    _, edges = cv2.threshold(edges, 100, 255, cv2.THRESH_BINARY_INV)

    # Step 3: Color quantization
    Z = detail.reshape((-1, 3)).astype(np.float32)
    K = 2000  # Use higher value for more detail
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(Z, K, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
    quantized = centers[labels.flatten()].reshape(img.shape).astype(np.uint8)

    # Step 4: Blend edges with quantized image
    edges_inv = cv2.bitwise_not(edges)
    edges_bgr = cv2.cvtColor(edges_inv, cv2.COLOR_GRAY2BGR)
    cartoon = cv2.addWeighted(quantized, 1.0, edges_bgr, 0.25, 0)

    # Save result
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
