import { FastifyInstance } from 'fastify';

export class AIAgentService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Simulates AI content review: summarizes, tags, and scores content.
   */
  async reviewContent(contentId: number) {
    const client = await this.fastify.pg.connect();
    try {
      // 1. Fetch content
      const { rows } = await client.query('SELECT * FROM content_items WHERE id = $1', [contentId]);
      if (rows.length === 0) throw new Error('Content not found');
      
      const content = rows[0];
      const body = content.body;

      // 2. AI Processing (Summarize + Policy Check)
      const summary = await this.summarizeContent(body);
      const policyResult = await this.analyzeContentPolicy(body);
      const score = Math.floor(Math.random() * 21) + 80; // Score 80-100
      const isSensitive = policyResult.hasViolations || body.toLowerCase().includes('bí mật') || body.toLowerCase().includes('khẩn');
      
      const tags = ['AI_Reviewed'];
      if (content.title.includes('Lễ')) tags.push('Sự kiện');
      if (policyResult.sentiment === 'positive') tags.push('Tích cực');

      // 3. Update Content Item
      await client.query(
        'UPDATE content_items SET summary = $1, tags = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
        [summary, tags, 'pending_review', contentId]
      );

      // 4. Record Review
      await client.query(
        `INSERT INTO content_reviews (content_id, reviewer_type, score, comments, is_sensitive) 
         VALUES ($1, $2, $3, $4, $5)`,
        [contentId, 'ai', score, policyResult.feedback || 'Nội dung phù hợp với tiêu chuẩn phát thanh quân sự.', isSensitive]
      );

      // 5. Create Notification (Scoped to content unit)
      await client.query(
        `INSERT INTO notifications (title, message, type, link, sender_name, priority, unit_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'Bản tin mới chờ duyệt', 
          'Bạn có 1 bản tin mới chờ duyệt.',
          isSensitive ? 'warning' : 'info',
          'ai',
          'Hệ thống AI',
          isSensitive ? 'high' : 'medium',
          content.unit_id
        ]
      );

      return { summary, score, tags, isSensitive, policyFeedback: policyResult.feedback };
    } finally {
      client.release();
    }
  }

  /**
   * Generates a concise summary using simulated AI logic.
   */
  async summarizeContent(text: string) {
    if (!text) return '';
    const lines = text.split('\n').filter(l => l.trim().length > 20);
    if (lines.length <= 1) return text.substring(0, 150) + (text.length > 150 ? '...' : '');
    
    // Simulate smart summarization by picking key sentences or generating a lead
    return `Tóm tắt: ${lines[0].substring(0, 100)}... Bản tin tập trung vào nội dung triển khai kế hoạch đơn vị và các lưu ý quan trọng về kỷ luật.`;
  }

  /**
   * Analyzes content for policy compliance, sentiment, and technical quality.
   */
  async analyzeContentPolicy(text: string) {
    if (!text) return { hasViolations: false, score: 0, feedback: 'Nội dung rỗng' };

    const forbiddenWords = ['tệ nạn', 'cờ bạc', 'rượu chè', 'bỏ ngũ', 'vắng mặt trái phép'];
    const politicalWords = ['phản động', 'biểu tình', 'bạo động', 'xuyên tạc'];
    const securityWords = ['mật mã', 'tọa độ', 'đặc công', 'bí mật quân sự'];
    const slangWords = ['vcl', 'đcm', 'cl', 'vl', 'đéo'];
    
    const violations: { word: string, category: string }[] = [];
    const lowerText = text.toLowerCase();
    
    const checkList = [
      { list: forbiddenWords, cat: 'Kỷ luật' },
      { list: politicalWords, cat: 'Chính trị' },
      { list: securityWords, cat: 'An ninh' },
      { list: slangWords, cat: 'Văn hóa' }
    ];

    for (const item of checkList) {
      for (const word of item.list) {
        if (lowerText.includes(word)) {
          violations.push({ word, category: item.cat });
        }
      }
    }

    const uniqueViolations = violations.filter((v, i, a) => a.findIndex(t => t.word === v.word) === i);
    const hasViolations = uniqueViolations.length > 0;
    
    // Calculate Quality Score (0-100)
    let score = 100;
    if (text.length < 50) score -= 30; // Too short
    if (!text.includes('Kính thưa') && !text.includes('Chào')) score -= 10; // Missing greeting
    if (hasViolations) score -= (uniqueViolations.length * 20);
    score = Math.max(0, score);

    const sentiment = text.includes('Chúc mừng') || text.includes('tốt đẹp') ? 'positive' : 'neutral';

    return {
      hasViolations,
      violations: uniqueViolations,
      sentiment,
      score,
      feedback: hasViolations 
        ? `CẢNH BÁO: Phát hiện ${uniqueViolations.length} nhóm từ nhạy cảm (${uniqueViolations.map(v => v.category).join(', ')}). Cần rà soát kỹ.`
        : (score > 80 ? 'Nội dung đảm bảo tính chính quy, đạt chất lượng tốt.' : 'Nội dung ổn nhưng cần bổ sung thêm các yếu tố chào hỏi/chi tiết.')
    };
  }

  /**
   * Smarter AI schedule suggestion based on content type and metadata.
   */
  async generateScheduleSuggestion(contentId: number) {
    const client = await this.fastify.pg.connect();
    try {
      // 1. Fetch content metadata
      const { rows: contentRows } = await client.query('SELECT title, tags, unit_id FROM content_items WHERE id = $1', [contentId]);
      if (contentRows.length === 0) throw new Error('Content not found');
      
      const content = contentRows[0];
      const tags = content.tags || [];
      const title = content.title.toLowerCase();

      // 2. Select optimized time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      let hour = 10; // Default: 10:00 AM
      let reasoning = 'Đề xuất khung giờ mặc định cho tin tức tổng hợp.';

      const isHighPriority = tags.includes('Chính trị') || tags.includes('Tin nóng') || title.includes('khẩn') || title.includes('quan trọng');
      const isLeisure = tags.includes('Văn hóa') || tags.includes('Giải trí') || title.includes('ca nhạc') || title.includes('lễ hội');

      if (isHighPriority) {
        hour = 7; // 7:00 AM
        reasoning = 'Tin tức quan trọng/chính trị: Nên phát vào đầu giờ sáng để phổ biến rộng rãi tới cán bộ, chiến sĩ.';
      } else if (isLeisure) {
        hour = 17; // 5:00 PM
        reasoning = 'Nội dung văn hóa/giải trí: Khung giờ chiều tối phù hợp để thư giãn và sinh hoạt văn nghệ.';
      }

      tomorrow.setHours(hour, 0, 0, 0);
      const suggestedTime = tomorrow.toISOString();

      // 3. Select channel (Simulated logic)
      const channelId = isHighPriority ? 1 : 2; // Channel 1 for important/news, Channel 2 for others
      
      const suggestedText = `${reasoning} Đề xuất phát lúc ${tomorrow.toLocaleTimeString('vi-VN')} tại kênh ${channelId}.`;

      // 4. Record Suggestion
      const { rows } = await client.query(
        `INSERT INTO ai_suggestions (content_id, suggestion_type, suggested_text, is_applied) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [contentId, 'schedule_optimization', suggestedText, false]
      );

      // 5. Create Notification for Suggestion
      await client.query(
        `INSERT INTO notifications (title, message, type, link, sender_name, priority, unit_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'Đề xuất lịch phát sóng', 
          `Hệ thống AI vừa đề xuất lịch phát sóng tối ưu cho bản tin "${content.title}".`,
          'info',
          'ai',
          'Trợ lý AI',
          'medium',
          content.unit_id
        ]
      );

      return { 
        suggestionId: rows[0].id, 
        suggestedTime, 
        channelId,
        reasoning
      };
    } finally {
      client.release();
    }
  }

  /**
   * Generates a formal military broadcast script from raw notes/text.
   */
  async generateScript(rawText: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY');
    }

    const payload = {
      contents: [{
        parts: [{
          text: `Bạn là biên tập viên chuyên nghiệp của đài phát thanh. Dưới đây là nội dung một bản tin.
Nhiệm vụ của bạn là dọn dẹp và chuẩn hóa văn bản này để sẵn sàng đọc lên đài phát thanh:
1. Loại bỏ các phần thể thức hành chính nếu có (nhảy quan, tiêu ngữ, thông tin người ký, nơi nhận...).
2. Chỉ tập trung dọn dẹp nội dung chính: sửa lỗi chính tả, chuyển các từ viết tắt thành từ đầy đủ, loại bỏ các khoảng trắng và dãn dòng dư thừa.
3. TUYỆT ĐỐI KHÔNG TÓM TẮT, KHÔNG LƯỢC BỎ bất kỳ thông tin quan trọng hay câu văn nào của nội dung gốc. Giữ nguyên 100% các con số, sự kiện và thông tin chi tiết. 
4. KHÔNG tự ý thay đổi văn phong hay cấu trúc câu của người dùng, ngoại trừ việc sửa lỗi ngữ pháp cơ bản để câu văn chuẩn xác hơn.
5. Mở đầu bằng lời chào: "Kính chào các đồng chí và các bạn, mời các đồng chí đến với bản tin phát thanh hôm nay."
6. Kết thúc bằng lời chào: "Bản tin đến đây là kết thúc, xin cảm ơn và chúc sức khỏe các đồng chí."
7. Kết quả trả về phải là 100% VĂN BẢN THUẦN, không sử dụng định dạng Markdown (như **, #, -), không chứa các ghi chú hay ngoặc vuông.

Văn bản cần xử lý:
${rawText}`
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        topP: 0.8,
        topK: 40
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent?key=${apiKey}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (!response.ok) {
        console.error('Gemini error details:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        throw new Error(`Lỗi gọi API Google Gemini: ${response.status} ${response.statusText}`);
      }

      let script = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      if (!script) {
        console.error('Gemini returned empty parts:', data);
        throw new Error('AI không trả về nội dung kịch bản');
      }

      // Fallback cleanup if the AI still outputs markdown
      script = script.replace(/\*\*/g, '').replace(/#/g, '');

      const lines = rawText.split('\n').filter(l => l.trim().length > 0);
      const title = lines[0] || 'Thông báo mới';

      return {
        title: `Bản tin: ${title.substring(0, 60)}...`,
        script: script,
        wordCount: script.split(/\s+/).length,
        estimatedDuration: Math.ceil(script.split(/\s+/).length / 130) + ' phút'
      };
    } catch (err) {
      console.error('generateScript error:', err);
      throw err;
    }
  }
}
