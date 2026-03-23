#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Xiaozhi Local Chat - Test Components
Kiểm tra từng thành phần của hệ thống chat AI local
"""

import sys
import os
import asyncio
import time
from pathlib import Path

# Thêm đường dẫn dự án vào sys.path
project_root = Path(__file__).parent / "main" / "xiaozhi-server"
sys.path.insert(0, str(project_root))

async def test_ollama_connection():
    """Test kết nối với Ollama"""
    print("🔍 Testing Ollama connection...")

    try:
        from core.providers.llm.ollama.ollama import OllamaLLM

        # Cấu hình cơ bản
        config = {
            "model_name": "qwen2.5:7b",
            "base_url": "http://localhost:11434",
            "temperature": 0.7,
            "max_tokens": 512
        }

        llm = OllamaLLM(config)
        await llm.initialize()

        # Test chat đơn giản
        messages = [{"role": "user", "content": "Xin chào, bạn là AI nào?"}]
        response = await llm.chat(messages)

        print("✅ Ollama connection successful")
        print(f"   Response: {response[:100]}...")
        return True

    except Exception as e:
        print(f"❌ Ollama connection failed: {e}")
        return False

async def test_fun_asr():
    """Test FunASR local"""
    print("🔍 Testing FunASR...")

    try:
        from core.providers.asr.fun_local import FunASR

        # Cấu hình
        config = {
            "model_dir": "main/xiaozhi-server/models/SenseVoiceSmall",
            "output_dir": "tmp/"
        }

        asr = FunASR(config)
        await asr.initialize()

        print("✅ FunASR initialized successfully")
        return True

    except Exception as e:
        print(f"❌ FunASR initialization failed: {e}")
        return False

async def test_edge_tts():
    """Test EdgeTTS"""
    print("🔍 Testing EdgeTTS...")

    try:
        from core.providers.tts.edge import EdgeTTS

        # Cấu hình
        config = {
            "voice": "vi-VN-HoaiMyNeural",
            "output_dir": "tmp/"
        }

        tts = EdgeTTS(config)
        await tts.initialize()

        # Test synthesis
        test_text = "Xin chào, đây là test tiếng Việt"
        audio_path = await tts.synthesize(test_text)

        if audio_path and os.path.exists(audio_path):
            print("✅ EdgeTTS synthesis successful")
            print(f"   Audio saved to: {audio_path}")
            return True
        else:
            print("❌ EdgeTTS synthesis failed")
            return False

    except Exception as e:
        print(f"❌ EdgeTTS failed: {e}")
        return False

async def test_silero_vad():
    """Test SileroVAD"""
    print("🔍 Testing SileroVAD...")

    try:
        from core.providers.vad.silero import SileroVAD

        # Cấu hình
        config = {
            "threshold": 0.5,
            "threshold_low": 0.3,
            "model_dir": "main/xiaozhi-server/models/snakers4_silero-vad",
            "min_silence_duration_ms": 200
        }

        vad = SileroVAD(config)
        await vad.initialize()

        print("✅ SileroVAD initialized successfully")
        return True

    except Exception as e:
        print(f"❌ SileroVAD failed: {e}")
        return False

async def main():
    """Chạy tất cả các test"""
    print("🚀 Xiaozhi Local Chat - Component Tests")
    print("=" * 50)

    # Tạo thư mục tmp nếu chưa có
    os.makedirs("tmp", exist_ok=True)

    results = {}

    # Test từng thành phần
    print("\n1. Testing Ollama LLM...")
    results["ollama"] = await test_ollama_connection()

    print("\n2. Testing FunASR...")
    results["funasr"] = await test_fun_asr()

    print("\n3. Testing EdgeTTS...")
    results["edge_tts"] = await test_edge_tts()

    print("\n4. Testing SileroVAD...")
    results["silero_vad"] = await test_silero_vad()

    # Tổng kết
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print("=" * 50)

    passed = 0
    total = len(results)

    for component, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"   {component.upper()}: {status}")
        if success:
            passed += 1

    print(f"\n🎯 Overall: {passed}/{total} components passed")

    if passed == total:
        print("🎉 All components are working! Ready to start the server.")
        print("\nTo start the server:")
        print("   cd main/xiaozhi-server")
        print("   python app.py")
    else:
        print("⚠️  Some components failed. Please check the errors above.")
        print("\nTroubleshooting:")
        print("   - Make sure Ollama is running: ollama serve")
        print("   - Check model availability: ollama list")
        print("   - Verify model files exist in models/ directory")

    return passed == total

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)

