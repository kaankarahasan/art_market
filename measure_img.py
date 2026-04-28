from PIL import Image
import sys

try:
    img = Image.open('assets/view_in_room_3.jpg')
    w, h = img.size
    print(f"Original Size: {w}x{h}")
    # We can't automatically find the red box in the original image because the red box is only in the user's uploaded image.
    # But we can find the door right edge and wall right edge by analyzing column averages or just manual inspection if I print out a scaled-down ASCII art, or just take the numbers I visually estimated.
except Exception as e:
    print(e)
