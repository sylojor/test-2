import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

sftp = ssh.open_sftp()
with sftp.open('/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts', 'rb') as f:
    raw = f.read()

content = raw.decode('utf-8')

# Add a PNG chunk stripper function that removes unnecessary chunks (pHYs, tEXt, iTXt, etc.)
# This function strips all PNG chunks except: IHDR, PLTE, tRNS, IDAT, IEND
# This significantly reduces file size

stripper_function = '''
// --- Strip unnecessary PNG chunks for minimal file size ---
// Keeps only: IHDR, PLTE, tRNS, IDAT, IEND
// Removes: pHYs, tEXt, iTXt, bKGD, cHRM, gAMA, iCCP, sBIT, sRGB, etc.
// This can save 20-60 bytes per PNG, crucial for favicon size optimization
function stripPngChunks(pngBuffer: Buffer): Buffer {
  // PNG structure: 8-byte signature + chunks
  // Each chunk: 4-byte length + 4-byte type + data + 4-byte CRC
  const signature = pngBuffer.subarray(0, 8) // Always keep PNG signature
  const essentialTypes = ["IHDR", "PLTE", "tRNS", "IDAT", "IEND"]
  const chunks: Buffer[] = [Buffer.from(signature)]

  let offset = 8
  while (offset < pngBuffer.length) {
    if (offset + 8 > pngBuffer.length) break // Incomplete chunk header

    const length = pngBuffer.readUInt32BE(offset)
    const type = pngBuffer.subarray(offset + 4, offset + 8).toString("ascii")

    // Total chunk size: 4 (length) + 4 (type) + length (data) + 4 (CRC)
    const chunkSize = 12 + length
    if (offset + chunkSize > pngBuffer.length) break // Incomplete chunk

    if (essentialTypes.includes(type)) {
      chunks.push(Buffer.from(pngBuffer.subarray(offset, offset + chunkSize)))
    }
    // Skip non-essential chunks (pHYs, tEXt, etc.)

    offset += chunkSize
  }

  return Buffer.concat(chunks)
}
'''

# Find where to insert the stripper function (before createMinimalIco)
insert_marker = "// --- Create minimal ICO favicon ---"
marker_idx = content.find(insert_marker)
if marker_idx >= 0:
    content = content[:marker_idx] + stripper_function + "\n" + content[marker_idx:]
    print("✅ Added stripPngChunks function before createMinimalIco")
else:
    print("❌ Could not find insert marker")

# Now update the favicon upload code to use stripPngChunks
# Find the main favicon upload section and add stripPngChunks call after sharp processing

# For the ICO upload section (when user uploads .ico file):
# Find: const png16 = await sharp(buffer)... and add stripping after
old_ico_png = 'const png16 = await sharp(buffer)\n            .resize(16, 16, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })\n            .png({ palette: true, compressionLevel: 9, colours: 16, effort: 10 })\n            .toBuffer()\n          saveBrandingFile("favicon-16x16.png", png16)'

new_ico_png = 'const png16Raw = await sharp(buffer)\n            .resize(16, 16, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })\n            .png({ palette: true, compressionLevel: 9, colours: 16, effort: 10 })\n            .toBuffer()\n          const png16 = stripPngChunks(png16Raw)\n          saveBrandingFile("favicon-16x16.png", png16)'

if old_ico_png in content:
    content = content.replace(old_ico_png, new_ico_png)
    print("✅ Updated ICO upload section with stripPngChunks")
else:
    print("❌ Could not find ICO upload png16 section")

# For the Image upload section (main favicon creation):
# Find: png16Buffer creation
old_img_png = 'const png16Buffer = await sharp(buffer)\n        .resize(16, 16, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })\n        .png({ palette: true, compressionLevel: 9, colours: 16, effort: 10 })\n        .toBuffer()'

new_img_png = 'const png16BufferRaw = await sharp(buffer)\n        .resize(16, 16, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })\n        .png({ palette: true, compressionLevel: 9, colours: 16, effort: 10 })\n        .toBuffer()\n      const png16Buffer = stripPngChunks(png16BufferRaw)'

if old_img_png in content:
    content = content.replace(old_img_png, new_img_png)
    print("✅ Updated Image upload section with stripPngChunks")
else:
    print("❌ Could not find Image upload png16Buffer section")

# Write back
with sftp.open('/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts', 'w') as f:
    f.write(content)

print(f"\n✅ File saved. Size: {len(content)} chars")

# Verify
with sftp.open('/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts', 'r') as f:
    verify = f.read().decode('utf-8')

if 'stripPngChunks' in verify:
    count = verify.count('stripPngChunks')
    print(f"✅ Verified: stripPngChunks appears {count} times")
else:
    print("❌ stripPngChunks not found!")

sftp.close()
ssh.close()
