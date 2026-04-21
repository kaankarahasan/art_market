from PIL import Image
import sys

img = Image.open('assets/view_in_room_2.jpg')
img = img.resize((120, 60))
img = img.convert('L')
pixels = img.load()
chars = " .:-=+*#%@"

out = ""
for y in range(img.height):
    for x in range(img.width):
        out += chars[int(pixels[x, y] / 255.0 * (len(chars) - 1))]
    out += "\n"

print(out)
