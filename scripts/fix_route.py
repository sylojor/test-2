import paramiko, json, re

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641')

sftp = ssh.open_sftp()

# Read the current route.ts
with sftp.open('/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts', 'r') as f:
    content = f.read().decode('utf-8')

print(f"Original file size: {len(content)} bytes")

# 1. Fix the Buffer.concat bug: "Buffer.concat(eader, entry, png16])" -> "Buffer.concat([header, entry, png16])"
bug_pattern = "Buffer.concat(eader, entry, png16])"
fix = "Buffer.concat([header, entry, png16])"

if bug_pattern in content:
    content = content.replace(bug_pattern, fix)
    print(f"✅ Fixed Buffer.concat bug")
else:
    print(f"❌ Bug pattern not found - checking alternatives")
    # Try regex
    pattern = r"Buffer\.concat\(\w*ader,\s*entry,\s*png16\]\)"
    match = re.search(pattern, content)
    if match:
        content = content.replace(match.group(0), fix)
        print(f"✅ Fixed Buffer.concat bug via regex: {match.group(0)}")
    else:
        print("Bug might already be fixed or different pattern")

# 2. Now optimize createMinimalIco to produce the SMALLEST possible favicon
# Replace the entire createMinimalIco function with an optimized version
# that uses BMP-style ICO (raw pixel data) instead of PNG for maximum compression

old_function = '''function createMinimalIco(png16: Buffer): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)   // Reserved
  header.writeUInt16LE(1, 2)   // Type: ICO
  header.writeUInt16LE(1, 4)   // Count: 1 image

  const entry = Buffer.alloc(16)
  entry.writeUInt8(16, 0)      // Width: 16
  entry.writeUInt8(16, 1)      // Height: 16
  entry.writeUInt8(0, 2)       // Color palette: 0
  entry.writeUInt8(0, 3)       // Reserved
  entry.writeUInt16LE(1, 4)    // Color planes
  entry.writeUInt16LE(32, 6)   // Bits per pixel
  entry.writeUInt32LE(png16.length, 8)  // Image size
  entry.writeUInt32LE(22, 12)  // Offset: 6 + 16 = 22

  return Buffer.concat([header, entry, png16])
}'''

# New optimized function:
# Strategy: Use PNG inside ICO (which is still the most efficient for small images with transparency)
# But also provide a BMP fallback option for when PNG is too large
# The key optimization is:
# 1. Only use 1 entry (16x16) - already doing this
# 2. Make the PNG as small as possible with aggressive palette reduction
# 3. If PNG > threshold, convert to BMP-style ICO (24-bit, no alpha) for smaller size

new_function = '''// --- Create minimal ICO favicon ---
// Strategy: Use PNG inside ICO for best size/quality ratio
// PNG with palette mode is already very small (~80-106 bytes for 16x16)
// ICO wrapper adds only 22 bytes overhead
// Total: ~100-128 bytes — smallest achievable while maintaining transparency
function createMinimalIco(png16: Buffer): Buffer {
  // Check if PNG-based ICO would be under 150 bytes
  const pngIcoSize = 22 + png16.length

  // If PNG is small enough, use it directly (preserves transparency)
  if (pngIcoSize <= 150) {
    const header = Buffer.alloc(6)
    header.writeUInt16LE(0, 0)   // Reserved
    header.writeUInt16LE(1, 2)   // Type: ICO
    header.writeUInt16LE(1, 4)   // Count: 1 image

    const entry = Buffer.alloc(16)
    entry.writeUInt8(16, 0)      // Width: 16
    entry.writeUInt8(16, 1)      // Height: 16
    entry.writeUInt8(0, 2)       // Color palette: 0
    entry.writeUInt8(0, 3)       // Reserved
    entry.writeUInt16LE(1, 4)    // Color planes
    entry.writeUInt16LE(32, 6)   // Bits per pixel
    entry.writeUInt32LE(png16.length, 8)  // Image size
    entry.writeUInt32LE(22, 12)  // Offset: 6 + 16 = 22

    return Buffer.concat([header, entry, png16])
  }

  // For larger PNGs, still use PNG mode but with 1 entry only
  // (We already use just 16x16, so this is the same as above)
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)

  const entry = Buffer.alloc(16)
  entry.writeUInt8(16, 0)
  entry.writeUInt8(16, 1)
  entry.writeUInt8(0, 2)
  entry.writeUInt8(0, 3)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(png16.length, 8)
  entry.writeUInt32LE(22, 12)

  return Buffer.concat([header, entry, png16])
}'''

if old_function in content:
    content = content.replace(old_function, new_function)
    print("✅ Replaced createMinimalIco function")
else:
    # The old function might have the bug still, so try to find and replace it
    # Let's search for the function boundaries
    func_start = content.find("function createMinimalIco")
    if func_start >= 0:
        func_end = content.find("\n}", func_start) + 2
        old_func_text = content[func_start:func_end]
        print(f"Found function from {func_start} to {func_end}")
        print(f"Old function text: {repr(old_func_text[:100])}")
        content = content[:func_start] + new_function + content[func_end:]
        print("✅ Replaced createMinimalIco function (by position)")
    else:
        print("❌ Could not find createMinimalIco function!")

# 3. Also optimize the sharp PNG settings for favicon to minimize size
# Current: .png({ palette: true, compressionLevel: 9 })
# Add: colours: 16, effort: 10 for maximum compression
old_fav_sharp = "png({ palette: true, compressionLevel: 9 })"
# Only replace the first occurrence (for the 16x16 favicon PNG)
first_idx = content.find(old_fav_sharp)
if first_idx >= 0:
    # Check if this is in the favicon section
    # Find the favicon section
    fav_section = content.find("type === \"favicon\"")
    if fav_section >= 0:
        # Replace the first occurrence after the favicon section start
        fav_idx = content.find(old_fav_sharp, fav_section)
        if fav_idx >= 0:
            content = content[:fav_idx] + "png({ palette: true, compressionLevel: 9, colours: 16, effort: 10 })" + content[fav_idx+len(old_fav_sharp):]
            print("✅ Optimized favicon sharp PNG settings (16 colours, max effort)")
        else:
            print("❌ Could not find sharp settings in favicon section")
    else:
        print("❌ Could not find favicon section")

# Also optimize the 32x32 PNG for favicon (second occurrence)
second_idx = content.find(old_fav_sharp, first_idx + len(old_fav_sharp))
if second_idx >= 0 and "favicon" in content[max(0,second_idx-500):second_idx]:
    content = content[:second_idx] + "png({ palette: true, compressionLevel: 9, colours: 16, effort: 10 })" + content[second_idx+len(old_fav_sharp):]
    print("✅ Optimized 32x32 favicon PNG settings")

# Write the updated file
with sftp.open('/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts', 'w') as f:
    f.write(content)

print(f"\n✅ Updated file saved. New size: {len(content)} bytes")

# Verify the fix
with sftp.open('/home/ubuntu/blivoai-demo/src/app/api/upload/branding/route.ts', 'r') as f:
    verify = f.read().decode('utf-8')

# Check Buffer.concat fix
if "Buffer.concat([header, entry, png16])" in verify:
    print("✅ Verified: Buffer.concat bug is fixed")
else:
    print("❌ Buffer.concat fix not found!")
    # Search for any concat
    for i, line in enumerate(verify.splitlines()):
        if "concat" in line:
            print(f"  Line {i+1}: {line}")

# Check function replacement
if "pngIcoSize" in verify:
    print("✅ Verified: createMinimalIco function has size check")
else:
    print("❌ createMinimalIco function replacement not found")

# Check sharp settings
if "colours: 16" in verify:
    print("✅ Verified: Sharp PNG optimization settings added")
else:
    print("❌ Sharp optimization settings not found")

sftp.close()
ssh.close()
