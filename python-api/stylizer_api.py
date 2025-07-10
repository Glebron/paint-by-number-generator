from flask import Flask, request, send_file
import cv2
import numpy as np
import zipfile

app = Flask(__name__)


def stylize_image(image_path, output_color_path, output_outline_path):
    img = cv2.imread(image_path)
    img = cv2.resize(img, (1024, int(img.shape[0] * 1024 / img.shape[1])))

    # Повышаем контраст и убираем шум
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2Lab)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    lab = cv2.merge((l, a, b))
    img = cv2.cvtColor(lab, cv2.COLOR_Lab2BGR)
    img = cv2.bilateralFilter(img, 9, 75, 75)

    # K-means кластеризация
    Z = img.reshape((-1, 3)).astype(np.float32)
    K = 8
    _, labels, centers = cv2.kmeans(
        Z, K, None,
        (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 1.0),
        10, cv2.KMEANS_PP_CENTERS
    )
    quantized = centers[labels.flatten()].reshape(img.shape).astype(np.uint8)

    # Преобразуем в градации серого (полностью)
    gray = cv2.cvtColor(quantized, cv2.COLOR_BGR2GRAY)
    gray_bgr = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)

    # Осветляем, если нужно (ближе к белому)
    opacity = 0.6 # 0 = original gray, 1 = full white
    white = np.full_like(gray_bgr, 255)
    blended = cv2.addWeighted(gray_bgr, 1 - opacity, white, opacity, 0)

    # Сохраняем стилизованное изображение
    cv2.imwrite(output_color_path, blended)

    # Пустой контур
    blank_outline = np.full((img.shape[0], img.shape[1]), 255, dtype=np.uint8)
    cv2.imwrite(output_outline_path, blank_outline)


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
