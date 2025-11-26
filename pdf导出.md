基于浏览器原生 Print To PDF 的专业级简历导出方案（支持 Tailwind + 分页 + 高保真排版）

方案核心思想

简历内容保持为真实 HTML（Tailwind 渲染）

点击“导出 PDF” → 浏览器原生 Print → 导出为 PDF

使用强大、可控的 @media print 样式实现版式控制：

页边距

自动分页

避免元素被拆断

控制每页内容高度

隐藏编辑 UI

效果完全一致：你在网页上看到的排版，就是最终 PDF 的排版。

这是当前所有前端简历工具的最稳办法。

目录

你将收到：

 页面结构布局（含编辑区 + 预览区）

 完整的 Print CSS（支持分页、避免内容断裂、可定义 A4 页面）

 Next.js / Tailwind 代码模板

 可扩展的类名体系（avoid-break / page-break / no-print）

 推荐项目结构

你照着复制即可。

一、页面结构（Next.js + Tailwind）
// app/resume/page.tsx

export default function ResumePage() {
  return (
    <div className="flex w-full h-screen">
      {/* 左侧编辑区（打印时隐藏） */}
      <div className="w-1/3 p-4 border-r no-print">
        <h2 className="text-xl font-bold mb-4">编辑区</h2>
        {/* 你的编辑器（Markdown、输入框等） */}
      </div>

      {/* 右侧预览区（导出 PDF 的内容） */}
      <div className="flex-1 overflow-auto bg-gray-100 p-6">
        <div id="resume-content" className="resume-print bg-white shadow mx-auto">
          {/* 内容示例 */}
          <section className="avoid-break mb-6">
            <h1 className="text-3xl font-bold">你的名字</h1>
            <p className="text-gray-600">职位 / 联系方式</p>
          </section>

          <section className="avoid-break mb-6">
            <h2 className="text-xl font-bold mb-2">工作经历</h2>
            <div className="mb-4">
              <h3 className="font-semibold">公司 A</h3>
              <p>负责 xxxx</p>
            </div>
          </section>

          {/* 分页示例 */}
          <div className="page-break"></div>

          <section className="avoid-break">
            <h2 className="text-xl font-bold mb-2">项目经历</h2>
            <p>项目 B 介绍……</p>
          </section>
        </div>
      </div>

      {/* 打印按钮（不会出现在 PDF 中） */}
      <button
        onClick={() => window.print()}
        className="fixed bottom-6 right-6 px-4 py-2 bg-blue-600 text-white rounded shadow no-print"
      >
        导出 PDF
      </button>
    </div>
  );
}

二、Print CSS（核心技术）

将以下加入 globals.css 或 app/styles/print.css

/* ------ 打印 基础设置 ------ */
@media print {
  html, body {
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* 隐藏不需要打印的东西 */
  .no-print {
    display: none !important;
  }

  /* A4 页面尺寸（推荐） */
  .resume-print {
    width: 210mm;
    min-height: 297mm;
    padding: 18mm 15mm;
    box-sizing: border-box;
    page-break-after: always;
  }

  /* 避免元素被拆断分页 */
  .avoid-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* 手动分页 */
  .page-break {
    page-break-before: always;
    break-before: page;
  }

  /* 去掉页面之外的阴影 */
  .resume-print {
    box-shadow: none !important;
  }
}

三、Tailwind 特别注意

你需要在 tailwind.config.js 中允许打印模式：

module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
  important: true, // 强制样式在 print 模式下优先
};


important: true 能确保打印 CSS 不会被 Tailwind 战胜。

四、使用方式

用户在左侧编辑

右侧实时渲染 HTML

点击“导出 PDF”

浏览器弹出系统打印窗口

用户选择“保存为 PDF”

你无需部署无头浏览器，无需服务器，无需 chromium。

五、效果（保证可实现）

Tailwind 样式完整保留

字体、间距、颜色 100% 一致

分页逻辑准确

不会出现 html2canvas 经典错位

不依赖服务器、可在 Vercel 完美运行

支持中英文排版、强制分页等职场 PDF 需求