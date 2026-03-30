export function openPrintWindow({ title, subtitle, sections }) {
  const popup = window.open('', '_blank', 'width=900,height=700')
  if (!popup) return

  popup.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
          h1 { margin-bottom: 8px; }
          h2 { margin-top: 24px; font-size: 18px; }
          .section { margin-top: 24px; }
          .muted { color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 0; text-align: left; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="muted">${subtitle || ''}</p>
        ${sections.map((section) => `<div class="section"><h2>${section.title}</h2>${section.content}</div>`).join('')}
      </body>
    </html>
  `)
  popup.document.close()
  popup.focus()
  popup.print()
}
