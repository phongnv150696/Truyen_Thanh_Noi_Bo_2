#!/usr/bin/env python3
"""
Script to add YAML frontmatter to markdown files
"""

import os
from pathlib import Path

def add_frontmatter_to_file(file_path: str, frontmatter: str):
    """Add YAML frontmatter to a markdown file"""
    
    # Read the original content
    with open(file_path, 'r', encoding='utf-8') as f:
        original_content = f.read()
    
    # Check if frontmatter already exists
    if original_content.startswith('---'):
        print(f"⚠️  {file_path} already has frontmatter, skipping...")
        return False
    
    # Combine frontmatter + original content
    new_content = frontmatter + "\n" + original_content
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"✅ Added frontmatter to {file_path}")
    return True

# Define frontmatters for each file
FRONTMATTERS = {
    'quan_su.md': '''---
title: "Nhận Thức Thường Xuyên Năm 2025 - Công Tác Quân Sự"
document_type: "reference_manual"
category: "quan_su"
unit: "Trung đoàn 8"
year: 2025
version: "1.0"
last_updated: "2025-01-08"
author: "Cơ quan Tham mưu Trung đoàn 8"
tags: ["quân sự", "huấn luyện", "mệnh lệnh 2025", "tác chiến"]
related_files: ["chinh_tri.md", "hau_can.md", "ky_thuat.md"]
---''',
    
    'hau_can.md': '''---
title: "Nhận Thức Thường Xuyên Năm 2025 - Công Tác Hậu Cần"
document_type: "reference_manual"
category: "hau_can"
unit: "Trung đoàn 8"
year: 2025
version: "1.0"
last_updated: "2025-01-15"
author: "Cơ quan Hậu cần Trung đoàn 8"
tags: ["hậu cần", "định mức", "phòng chống thiên tai", "tài chính"]
related_files: ["chinh_tri.md", "quan_su.md", "ky_thuat.md"]
---''',
    
    'ky_thuat.md': '''---
title: "Nhận Thức Thường Xuyên Năm 2025 - Công Tác Kỹ Thuật"
document_type: "reference_manual"
category: "ky_thuat"
unit: "Trung đoàn 8"
year: 2025
version: "1.0"
last_updated: "2025-01-15"
author: "Cơ quan Kỹ thuật Trung đoàn 8"
tags: ["kỹ thuật", "vũ khí", "đạn", "an toàn", "PCCC"]
related_files: ["chinh_tri.md", "quan_su.md", "hau_can.md"]
---'''
}

def main():
    """Main function"""
    base_dir = Path(__file__).parent
    
    print("🔧 Adding YAML frontmatter to markdown files...\n")
    
    success_count = 0
    for filename, frontmatter in FRONTMATTERS.items():
        file_path = base_dir / filename
        
        if not file_path.exists():
            print(f"❌ File not found: {file_path}")
            continue
        
        if add_frontmatter_to_file(str(file_path), frontmatter):
            success_count += 1
    
    print(f"\n✅ Successfully added frontmatter to {success_count}/{len(FRONTMATTERS)} files")

if __name__ == "__main__":
    main()
