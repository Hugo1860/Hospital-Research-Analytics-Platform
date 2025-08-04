const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// 注册中文字体（如果需要）
const registerFonts = (doc) => {
  // 这里可以注册中文字体，如果系统有的话
  // doc.registerFont('SimSun', path.join(__dirname, '../fonts/SimSun.ttf'));
  // 暂时使用默认字体
};

// 创建PDF报告生成器类
class PDFReportGenerator {
  constructor() {
    this.doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      }
    });
    
    registerFonts(this.doc);
    this.currentY = 50;
  }

  // 添加标题
  addTitle(title, fontSize = 20) {
    this.doc
      .fontSize(fontSize)
      .font('Helvetica-Bold')
      .text(title, 50, this.currentY, { align: 'center' });
    
    this.currentY += fontSize + 20;
    return this;
  }

  // 添加副标题
  addSubtitle(subtitle, fontSize = 14) {
    this.doc
      .fontSize(fontSize)
      .font('Helvetica')
      .text(subtitle, 50, this.currentY, { align: 'center' });
    
    this.currentY += fontSize + 15;
    return this;
  }

  // 添加分隔线
  addSeparator() {
    this.doc
      .moveTo(50, this.currentY)
      .lineTo(545, this.currentY)
      .stroke();
    
    this.currentY += 20;
    return this;
  }

  // 添加段落
  addParagraph(text, fontSize = 12) {
    const textHeight = this.doc
      .fontSize(fontSize)
      .font('Helvetica')
      .text(text, 50, this.currentY, {
        width: 495,
        align: 'left'
      });
    
    this.currentY += this.doc.heightOfString(text, { width: 495 }) + 10;
    return this;
  }

  // 添加表格
  addTable(headers, rows, options = {}) {
    const {
      startX = 50,
      startY = this.currentY,
      columnWidths = null,
      headerHeight = 25,
      rowHeight = 20,
      fontSize = 10
    } = options;

    const tableWidth = 495;
    const colCount = headers.length;
    const defaultColWidth = tableWidth / colCount;
    const colWidths = columnWidths || new Array(colCount).fill(defaultColWidth);

    // 绘制表头
    let currentX = startX;
    this.doc.fontSize(fontSize).font('Helvetica-Bold');
    
    // 表头背景
    this.doc
      .rect(startX, startY, tableWidth, headerHeight)
      .fillAndStroke('#f0f0f0', '#000000');

    // 表头文字
    headers.forEach((header, i) => {
      this.doc
        .fillColor('#000000')
        .text(header, currentX + 5, startY + 5, {
          width: colWidths[i] - 10,
          height: headerHeight - 10,
          align: 'center'
        });
      currentX += colWidths[i];
    });

    // 绘制数据行
    let currentRowY = startY + headerHeight;
    this.doc.font('Helvetica');

    rows.forEach((row, rowIndex) => {
      currentX = startX;
      
      // 行背景（交替颜色）
      const fillColor = rowIndex % 2 === 0 ? '#ffffff' : '#f9f9f9';
      this.doc
        .rect(startX, currentRowY, tableWidth, rowHeight)
        .fillAndStroke(fillColor, '#cccccc');

      // 行数据
      row.forEach((cell, colIndex) => {
        this.doc
          .fillColor('#000000')
          .text(String(cell || ''), currentX + 5, currentRowY + 3, {
            width: colWidths[colIndex] - 10,
            height: rowHeight - 6,
            align: 'left'
          });
        currentX += colWidths[colIndex];
      });

      currentRowY += rowHeight;
    });

    this.currentY = currentRowY + 20;
    return this;
  }

  // 添加统计卡片
  addStatCard(title, value, description = '', options = {}) {
    const {
      cardWidth = 120,
      cardHeight = 80,
      backgroundColor = '#f8f9fa',
      borderColor = '#dee2e6'
    } = options;

    // 绘制卡片背景
    this.doc
      .rect(50, this.currentY, cardWidth, cardHeight)
      .fillAndStroke(backgroundColor, borderColor);

    // 标题
    this.doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#6c757d')
      .text(title, 55, this.currentY + 10, {
        width: cardWidth - 10,
        align: 'center'
      });

    // 数值
    this.doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#212529')
      .text(String(value), 55, this.currentY + 25, {
        width: cardWidth - 10,
        align: 'center'
      });

    // 描述
    if (description) {
      this.doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#6c757d')
        .text(description, 55, this.currentY + 50, {
          width: cardWidth - 10,
          align: 'center'
        });
    }

    return this;
  }

  // 添加多个统计卡片（横向排列）
  addStatCards(cards, options = {}) {
    const {
      cardWidth = 120,
      cardHeight = 80,
      cardSpacing = 10
    } = options;

    const startX = 50;
    const availableWidth = 495;
    const totalCardsWidth = cards.length * cardWidth + (cards.length - 1) * cardSpacing;
    const offsetX = (availableWidth - totalCardsWidth) / 2;

    cards.forEach((card, index) => {
      const cardX = startX + offsetX + index * (cardWidth + cardSpacing);
      
      // 绘制卡片背景
      this.doc
        .rect(cardX, this.currentY, cardWidth, cardHeight)
        .fillAndStroke(card.backgroundColor || '#f8f9fa', '#dee2e6');

      // 标题
      this.doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#6c757d')
        .text(card.title, cardX + 5, this.currentY + 10, {
          width: cardWidth - 10,
          align: 'center'
        });

      // 数值
      this.doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#212529')
        .text(String(card.value), cardX + 5, this.currentY + 25, {
          width: cardWidth - 10,
          align: 'center'
        });

      // 描述
      if (card.description) {
        this.doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#6c757d')
          .text(card.description, cardX + 5, this.currentY + 50, {
            width: cardWidth - 10,
            align: 'center'
          });
      }
    });

    this.currentY += cardHeight + 20;
    return this;
  }

  // 添加简单图表（柱状图）
  addBarChart(data, options = {}) {
    const {
      title = '',
      width = 400,
      height = 200,
      maxValue = null,
      barColor = '#007bff'
    } = options;

    const chartX = 50 + (495 - width) / 2;
    const chartY = this.currentY;

    // 图表标题
    if (title) {
      this.doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(title, chartX, chartY, { width: width, align: 'center' });
      this.currentY += 20;
    }

    // 计算最大值
    const max = maxValue || Math.max(...data.map(item => item.value));
    const barWidth = width / data.length * 0.8;
    const barSpacing = width / data.length * 0.2;

    // 绘制柱状图
    data.forEach((item, index) => {
      const barHeight = (item.value / max) * height;
      const barX = chartX + index * (barWidth + barSpacing);
      const barY = chartY + height - barHeight + 20;

      // 绘制柱子
      this.doc
        .rect(barX, barY, barWidth, barHeight)
        .fillAndStroke(barColor, barColor);

      // 标签
      this.doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#000000')
        .text(item.label, barX, barY + barHeight + 5, {
          width: barWidth,
          align: 'center'
        });

      // 数值
      this.doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(String(item.value), barX, barY - 15, {
          width: barWidth,
          align: 'center'
        });
    });

    this.currentY += height + 50;
    return this;
  }

  // 添加新页面
  addPage() {
    this.doc.addPage();
    this.currentY = 50;
    return this;
  }

  // 添加页脚
  addFooter(text) {
    const pageHeight = this.doc.page.height;
    this.doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#6c757d')
      .text(text, 50, pageHeight - 30, {
        width: 495,
        align: 'center'
      });
    return this;
  }

  // 检查是否需要新页面
  checkPageBreak(requiredHeight = 100) {
    const pageHeight = this.doc.page.height;
    if (this.currentY + requiredHeight > pageHeight - 50) {
      this.addPage();
    }
    return this;
  }

  // 完成文档并返回buffer
  async finalize() {
    return new Promise((resolve, reject) => {
      const buffers = [];
      
      this.doc.on('data', buffers.push.bind(buffers));
      this.doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      this.doc.on('error', reject);
      
      this.doc.end();
    });
  }

  // 保存到文件
  async saveToFile(filePath) {
    const buffer = await this.finalize();
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  // 发送到HTTP响应
  pipe(res) {
    this.doc.pipe(res);
    return this.doc;
  }
}

module.exports = PDFReportGenerator;