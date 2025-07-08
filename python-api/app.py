from fastapi import FastAPI, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
from PIL import Image
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/contours")
async def extract_contours(
    file: UploadFile = File(...),
    num_colors: int = Query(25, description="Number of colors for quantization"),
    min_area: int = Query(600, description="Minimum region area"),
    epsilon_factor: float = Query(0.005, description="Contour simplification factor")
):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    h, w, _ = img.shape

    # Step 1: Edge-preserving smoothing (light)
    img_smoothed = cv2.bilateralFilter(img, d=5, sigmaColor=50, sigmaSpace=50)

    # Step 2: Quantization (Median Cut)
    img_pil = Image.fromarray(cv2.cvtColor(img_smoothed, cv2.COLOR_BGR2RGB))
    img_quant = img_pil.quantize(colors=num_colors, method=Image.MEDIANCUT)

    # Label map extraction → THIS FIXES THE PROBLEM
    quantized_labels = np.array(img_quant)  # Each pixel → 0..num_colors-1

    # Build palette from quantized image
    palette = img_quant.getpalette()[:num_colors * 3]
    palette = [palette[i:i + 3] for i in range(0, len(palette), 3)]

    contours_result = []

    # Step 3 + 4: For each label → create mask → morphological → contours
    for i in range(num_colors):
        # Create mask from label map
        mask = (quantized_labels == i).astype(np.uint8) * 255

        # Morphology → remove noise, fill holes
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area:
                continue

            M = cv2.moments(cnt)
            if M["m00"] != 0:
                cx = int(M["m10"] / M["m00"])
                cy = int(M["m01"] / M["m00"])
            else:
                cx, cy = 0, 0

            # Simplify contour → use epsilon parameter
            epsilon = epsilon_factor * cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, epsilon, True)

            points = approx.squeeze().tolist()
            if isinstance(points[0], int):
                points = [points]

            contours_result.append({
                "colorIndex": i,
                "points": points,
                "centroid": [cx, cy]
            })

    return {
        "palette": palette,
        "contours": contours_result
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
