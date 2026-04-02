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

      // 5. Create Notification
      await client.query(
        `INSERT INTO notifications (title, message, type, link, sender_name, priority) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'Bản tin mới chờ duyệt', 
          'Bạn có 1 bản tin mới chờ duyệt.',
          isSensitive ? 'warning' : 'info',
          'ai',
          'Hệ thống AI',
          isSensitive ? 'high' : 'medium'
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
      const { rows: contentRows } = await client.query('SELECT title, tags FROM content_items WHERE id = $1', [contentId]);
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
        `INSERT INTO notifications (title, message, type, link, sender_name, priority) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'Đề xuất lịch phát sóng', 
          `Hệ thống AI vừa đề xuất lịch phát sóng tối ưu cho bản tin "${content.title}".`,
          'info',
          'ai',
          'Trợ lý AI',
          'medium'
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
    // In a production app, this would call Gemini, Claude or OpenAI.
    // Here we simulate a high-quality transformation.
    
    const lines = rawText.split('\n').filter(l => l.trim().length > 0);
    const title = lines[0] || 'Thông báo mới';
    
    const script = `
[LỜI CHÀO/MỞ ĐẦU]
Kính thưa các đồng chí cán bộ, chiến sĩ toàn đơn vị! 
Đây là bản tin nội bộ từ hệ thống phát thanh OpenClaw. Sau đây là thông tin về: "${title}".

[NỘI DUNG CHÍNH]
Căn cứ vào kế hoạch công tác, đơn vị chúng ta triển khai nội dung sau:
${lines.map(l => `- ${l}`).join('\n')}

Yêu cầu các bộ phận liên quan nắm vững và triển khai nghiêm túc, đảm bảo đúng tiến độ và kỷ luật quân đội.

[KẾT LUẬN]
Đề nghị các đồng chí chú ý theo dõi các bản tin tiếp theo để cập nhật tình hình.
Chúc các đồng chí hoàn thành tốt nhiệm vụ được giao!
Xin trân trọng cảm ơn!
    `.trim();

    return {
      title: `Bản tin: ${title}`,
      script: script,
      wordCount: script.split(' ').length,
      estimatedDuration: Math.ceil(script.split(' ').length / 150) + ' phút'
    };
  }
}
