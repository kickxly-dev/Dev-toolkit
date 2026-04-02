import { useState, useRef } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import { toPng } from 'html-to-image';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-sql';

const LANGUAGES = [
  'javascript', 'typescript', 'jsx', 'tsx', 'python', 'rust', 'go',
  'bash', 'css', 'json', 'yaml', 'markdown', 'sql', 'html',
];

const THEMES: Record<string, Record<string, string>> = {
  'Dracula': {
    bg: '#282a36',
    text: '#f8f8f2',
    comment: '#6272a4',
    keyword: '#ff79c6',
    string: '#f1fa8c',
    function: '#50fa7b',
    number: '#bd93f9',
    operator: '#ff79c6',
    punctuation: '#f8f8f2',
  },
  'One Dark': {
    bg: '#282c34',
    text: '#abb2bf',
    comment: '#5c6370',
    keyword: '#c678dd',
    string: '#98c379',
    function: '#61afef',
    number: '#d19a66',
    operator: '#56b6c2',
    punctuation: '#abb2bf',
  },
  'Monokai': {
    bg: '#272822',
    text: '#f8f8f2',
    comment: '#75715e',
    keyword: '#f92672',
    string: '#e6db74',
    function: '#a6e22e',
    number: '#ae81ff',
    operator: '#f92672',
    punctuation: '#f8f8f2',
  },
  'Nord': {
    bg: '#2e3440',
    text: '#d8dee9',
    comment: '#616e88',
    keyword: '#81a1c1',
    string: '#a3be8c',
    function: '#88c0d0',
    number: '#b48ead',
    operator: '#81a1c1',
    punctuation: '#eceff4',
  },
  'Midnight': {
    bg: '#0a0a0a',
    text: '#e4e4e7',
    comment: '#52525b',
    keyword: '#3b82f6',
    string: '#22c55e',
    function: '#a78bfa',
    number: '#f59e0b',
    operator: '#3b82f6',
    punctuation: '#71717a',
  },
};

const BACKGROUNDS = [
  { name: 'Blue Gradient', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Sunset', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: 'Ocean', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { name: 'Forest', value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { name: 'Midnight', value: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)' },
  { name: 'Slate', value: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' },
  { name: 'None', value: 'transparent' },
];

const WINDOW_STYLES = ['none', 'macos', 'windows'] as const;

export default function CodeSnapshots() {
  const [code, setCode] = useState(`function greet(name: string) {\n  console.log(\`Hello, \${name}!\`);\n  return { message: \`Welcome to DevForge\` };\n}`);
  const [language, setLanguage] = useState('typescript');
  const [theme, setTheme] = useState('Dracula');
  const [padding, setPadding] = useState(32);
  const [fontSize, setFontSize] = useState(14);
  const [bgIndex, setBgIndex] = useState(0);
  const [windowStyle, setWindowStyle] = useState<typeof WINDOW_STYLES[number]>('macos');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [copied, setCopied] = useState(false);
  const snapshotRef = useRef<HTMLDivElement>(null);

  const themeColors = THEMES[theme];

  const highlightCode = (code: string, lang: string): string => {
    const grammar = Prism.languages[lang];
    if (!grammar) return escapeHtml(code);
    return Prism.highlight(code, grammar, lang);
  };

  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const exportPng = async () => {
    if (!snapshotRef.current) return;
    try {
      const dataUrl = await toPng(snapshotRef.current, { pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'code-snapshot.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const copyToClipboard = async () => {
    if (!snapshotRef.current) return;
    try {
      const dataUrl = await toPng(snapshotRef.current, { pixelRatio: 2 });
      const resp = await fetch(dataUrl);
      const blob = await resp.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const lines = code.split('\n');

  return (
    <div className="flex h-full">
      {/* Controls sidebar */}
      <div className="w-64 bg-bg-secondary border-r border-border-subtle flex flex-col shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-border-subtle">
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">
            Settings
          </span>
        </div>
        <div className="p-4 space-y-4">
          {/* Language */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent transition-colors"
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
              Theme
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent transition-colors"
            >
              {Object.keys(THEMES).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Background */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
              Background
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {BACKGROUNDS.map((bg, i) => (
                <button
                  key={i}
                  onClick={() => setBgIndex(i)}
                  className={`w-full aspect-square rounded-lg border-2 transition-colors ${
                    bgIndex === i ? 'border-accent' : 'border-transparent'
                  }`}
                  style={{ background: bg.value === 'transparent' ? '#1a1a1a' : bg.value }}
                  title={bg.name}
                />
              ))}
            </div>
          </div>

          {/* Window Style */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
              Window Style
            </label>
            <div className="flex gap-1">
              {WINDOW_STYLES.map((ws) => (
                <button
                  key={ws}
                  onClick={() => setWindowStyle(ws)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-medium capitalize transition-colors ${
                    windowStyle === ws
                      ? 'bg-accent/10 text-accent'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                  }`}
                >
                  {ws}
                </button>
              ))}
            </div>
          </div>

          {/* Padding */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
              Padding: {padding}px
            </label>
            <input
              type="range"
              min={0}
              max={80}
              value={padding}
              onChange={(e) => setPadding(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          {/* Font size */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
              Font Size: {fontSize}px
            </label>
            <input
              type="range"
              min={10}
              max={24}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>

          {/* Line numbers */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showLineNumbers}
              onChange={(e) => setShowLineNumbers(e.target.checked)}
              className="accent-accent"
            />
            <label className="text-xs text-text-secondary">Line numbers</label>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div>
            <h1 className="text-lg font-semibold">Code Snapshots</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Create beautiful code images
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-text-secondary text-xs font-medium rounded-lg transition-colors"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={exportPng}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Download size={13} />
              Export PNG
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Code editor */}
          <div className="h-40 shrink-0 border-b border-border-subtle">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your code here..."
              className="w-full h-full bg-bg-primary px-6 py-4 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none resize-none"
              spellCheck={false}
            />
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-bg-tertiary">
            <div
              ref={snapshotRef}
              style={{
                padding: BACKGROUNDS[bgIndex].value === 'transparent' ? 0 : padding,
                background: BACKGROUNDS[bgIndex].value,
                borderRadius: BACKGROUNDS[bgIndex].value === 'transparent' ? 0 : 16,
              }}
            >
              <div
                style={{
                  background: themeColors.bg,
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                }}
              >
                {/* Window chrome */}
                {windowStyle === 'macos' && (
                  <div
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
                  </div>
                )}
                {windowStyle === 'windows' && (
                  <div
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 12,
                      color: themeColors.comment,
                      fontSize: 12,
                    }}
                  >
                    <span>&#8212;</span>
                    <span>&#9723;</span>
                    <span>&times;</span>
                  </div>
                )}

                {/* Code */}
                <div
                  style={{
                    padding: windowStyle === 'none' ? '20px 24px' : '4px 24px 20px',
                    fontSize,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    lineHeight: 1.6,
                    overflowX: 'auto',
                  }}
                >
                  {lines.map((line, i) => (
                    <div key={i} style={{ display: 'flex', minHeight: fontSize * 1.6 }}>
                      {showLineNumbers && (
                        <span
                          style={{
                            display: 'inline-block',
                            width: lines.length > 99 ? 40 : 28,
                            textAlign: 'right',
                            marginRight: 16,
                            color: themeColors.comment,
                            userSelect: 'none',
                            opacity: 0.5,
                          }}
                        >
                          {i + 1}
                        </span>
                      )}
                      <span
                        dangerouslySetInnerHTML={{
                          __html: highlightCode(line || ' ', language),
                        }}
                        style={{
                          color: themeColors.text,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Prism theme override */}
      <style>{`
        .token.comment, .token.prolog, .token.doctype, .token.cdata { color: ${themeColors.comment}; }
        .token.keyword, .token.tag, .token.boolean, .token.constant { color: ${themeColors.keyword}; }
        .token.string, .token.char, .token.attr-value, .token.template-string { color: ${themeColors.string}; }
        .token.function, .token.class-name { color: ${themeColors.function}; }
        .token.number { color: ${themeColors.number}; }
        .token.operator, .token.entity { color: ${themeColors.operator}; }
        .token.punctuation { color: ${themeColors.punctuation}; }
        .token.property, .token.attr-name { color: ${themeColors.function}; }
      `}</style>
    </div>
  );
}
