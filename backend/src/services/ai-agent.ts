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

      // 2. Simulate AI Processing
      const summary = `Bản tin về "${content.title.substring(0, 30)}..." đã được rà soát tự động. Nội dung tập trung vào các vấn đề quân sự và tuyên truyền.`;
      const score = Math.floor(Math.random() * 21) + 80; // Score 80-100
      const isSensitive = body.toLowerCase().includes('bí mật') || body.toLowerCase().includes('khẩn');
      const tags = ['AI_Reviewed', content.title.includes('Lễ') ? 'Sự kiện' : 'Thông tin'];

      // 3. Update Content Item
      await client.query(
        'UPDATE content_items SET summary = $1, tags = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
        [summary, tags, 'approved', contentId]
      );

      // 4. Record Review
      await client.query(
        `INSERT INTO content_reviews (content_id, reviewer_type, score, comments, is_sensitive) 
         VALUES ($1, $2, $3, $4, $5)`,
        [contentId, 'ai', score, 'Nội dung phù hợp với tiêu chuẩn phát thanh quân sự.', isSensitive]
      );

      return { summary, score, tags, isSensitive };
    } finally {
      client.release();
    }
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
