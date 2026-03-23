import asyncio
import time
import aiohttp
import requests
from urllib.parse import urlparse, parse_qs
from typing import Optional, Dict
from config.logger import setup_logging
from core.utils.cache.manager import cache_manager
from core.utils.cache.config import CacheType

TAG = __name__
logger = setup_logging()


class VoiceprintProvider:
    """Voice recognition service provider"""
    
    def __init__(self, config: dict):
        self.original_url = config.get("url", "")
        self.speakers = config.get("speakers", [])
        self.speaker_map = self._parse_speakers()
        # Ngưỡng độ tương đồng nhận dạng giọng nói, mặc định 0.4
        self.similarity_threshold = float(config.get("similarity_threshold", 0.4))
        
        # Phân tích địa chỉ API và mã bí mật
        self.api_url = None
        self.api_key = None
        self.speaker_ids = []
        
        if not self.original_url:
            logger.bind(tag=TAG).warning("URL nhận dạng giọng nói chưa cấu hình, chức năng sẽ bị vô hiệu hóa")
            self.enabled = False
        else:
            # Phân tích URL và key
            parsed_url = urlparse(self.original_url)
            base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
            
            # Trích xuất key từ query parameters
            query_params = parse_qs(parsed_url.query)
            self.api_key = query_params.get('key', [''])[0]
            
            if not self.api_key:
                logger.bind(tag=TAG).error("Không tìm thấy tham số key trong URL, nhận dạng giọng nói sẽ bị vô hiệu hóa")
                self.enabled = False
            else:
                # Xây dựng địa chỉ identify interface
                self.api_url = f"{base_url}/voiceprint/identify"
                
                # Trích xuất speaker_ids
                for speaker_str in self.speakers:
                    try:
                        parts = speaker_str.split(",", 2)
                        if len(parts) >= 1:
                            speaker_id = parts[0].strip()
                            self.speaker_ids.append(speaker_id)
                    except Exception:
                        continue
                
                # Kiểm tra cấu hình speaker hợp lệ
                if not self.speaker_ids:
                    logger.bind(tag=TAG).warning("Chưa cấu hình speaker hợp lệ, nhận dạng giọng nói sẽ bị vô hiệu hóa")
                    self.enabled = False
                else:
                    # Kiểm tra health, verify server khả dụng
                    if self._check_server_health():
                        self.enabled = True
                        logger.bind(tag=TAG).info(f"Nhận dạng giọng nói đã bật: API={self.api_url}, Speakers={len(self.speaker_ids)}, Ngưỡng={self.similarity_threshold}")
                    else:
                        self.enabled = False
                        logger.bind(tag=TAG).warning(f"Server nhận dạng giọng nói không khả dụng, đã vô hiệu hóa: {self.api_url}")
    
    def _parse_speakers(self) -> Dict[str, Dict[str, str]]:
        """Phân tích cấu hình speaker"""
        speaker_map = {}
        for speaker_str in self.speakers:
            try:
                parts = speaker_str.split(",", 2)
                if len(parts) >= 3:
                    speaker_id, name, description = parts[0].strip(), parts[1].strip(), parts[2].strip()
                    speaker_map[speaker_id] = {
                        "name": name,
                        "description": description
                    }
            except Exception as e:
                logger.bind(tag=TAG).warning(f"Phân tích cấu hình speaker thất bại: {speaker_str}, lỗi: {e}")
        return speaker_map
    
    def _check_server_health(self) -> bool:
        """Kiểm tra trạng thái health server nhận dạng giọng nói"""
        if not self.api_url or not self.api_key:
            return False
    
        cache_key = f"{self.api_url}:{self.api_key}"
        
        # Kiểm tra cache
        cached_result = cache_manager.get(CacheType.VOICEPRINT_HEALTH, cache_key)
        if cached_result is not None:
            logger.bind(tag=TAG).debug(f"Sử dụng trạng thái health từ cache: {cached_result}")
            return cached_result
        
        # Cache hết hạn hoặc không tồn tại
        logger.bind(tag=TAG).info("Thực hiện kiểm tra health server giọng nói")
        
        try:
            # URL health check
            parsed_url = urlparse(self.api_url)
            health_url = f"{parsed_url.scheme}://{parsed_url.netloc}/voiceprint/health?key={self.api_key}"
            
            # Gửi yêu cầu health check
            response = requests.get(health_url, timeout=3)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("status") == "healthy":
                    logger.bind(tag=TAG).info("Server nhận dạng giọng nói health check thành công")
                    is_healthy = True
                else:
                    logger.bind(tag=TAG).warning(f"Trạng thái server nhận dạng giọng nói bất thường: {result}")
                    is_healthy = False
            else:
                logger.bind(tag=TAG).warning(f"Health check server nhận dạng giọng nói thất bại: HTTP {response.status_code}")
                is_healthy = False
                
        except requests.exceptions.ConnectTimeout:
            logger.bind(tag=TAG).warning("Kết nối server nhận dạng giọng nói timeout")
            is_healthy = False
        except requests.exceptions.ConnectionError:
            logger.bind(tag=TAG).warning("Kết nối server nhận dạng giọng nói bị từ chối")
            is_healthy = False
        except Exception as e:
            logger.bind(tag=TAG).warning(f"Health check server nhận dạng giọng nói lỗi: {e}")
            is_healthy = False
        
        # Sử dụng global cache manager để lưu kết quả
        cache_manager.set(CacheType.VOICEPRINT_HEALTH, cache_key, is_healthy)
        logger.bind(tag=TAG).info(f"Kết quả health check đã cache: {is_healthy}")
        
        return is_healthy
    
    async def identify_speaker(self, audio_data: bytes, session_id: str) -> Optional[str]:
        """Nhận dạng speaker"""
        if not self.enabled or not self.api_url or not self.api_key:
            logger.bind(tag=TAG).debug("Chức năng nhận dạng giọng nói đã tắt hoặc chưa cấu hình, bỏ qua")
            return None
            
        try:
            api_start_time = time.monotonic()
            
            # Chuẩn bị request headers
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Accept': 'application/json'
            }
            
            # Chuẩn bị multipart/form-data
            data = aiohttp.FormData()
            data.add_field('speaker_ids', ','.join(self.speaker_ids))
            data.add_field('file', audio_data, filename='audio.wav', content_type='audio/wav')
            
            timeout = aiohttp.ClientTimeout(total=10)
            
            # Network request
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(self.api_url, headers=headers, data=data) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        speaker_id = result.get("speaker_id")
                        score = result.get("score", 0)
                        total_elapsed_time = time.monotonic() - api_start_time
                        
                        logger.bind(tag=TAG).info(f"Thời gian nhận dạng giọng nói: {total_elapsed_time:.3f}s")
                        
                        # Kiểm tra ngưỡng độ tương đồng
                        if score < self.similarity_threshold:
                            logger.bind(tag=TAG).warning(f"Độ tương đồng {score:.3f} thấp hơn ngưỡng {self.similarity_threshold}")
                            return "Speaker không xác định"
                        
                        if speaker_id and speaker_id in self.speaker_map:
                            result_name = self.speaker_map[speaker_id]["name"]
                            logger.bind(tag=TAG).info(f"Nhận dạng giọng nói thành công: {result_name} (độ tương đồng: {score:.3f})")
                            return result_name
                        else:
                            logger.bind(tag=TAG).warning(f"Speaker ID không xác định: {speaker_id}")
                            return "Speaker không xác định"
                    else:
                        logger.bind(tag=TAG).error(f"API nhận dạng giọng nói lỗi: HTTP {response.status}")
                        return None
                        
        except asyncio.TimeoutError:
            elapsed = time.monotonic() - api_start_time
            logger.bind(tag=TAG).error(f"Nhận dạng giọng nói timeout: {elapsed:.3f}s")
            return None
        except Exception as e:
            elapsed = time.monotonic() - api_start_time
            logger.bind(tag=TAG).error(f"Nhận dạng giọng nói thất bại: {e}")
            return None

