export default function Titlebar() {
  const handleMin = () => (window as any).electron?.send('window-min');
  const handleMax = () => (window as any).electron?.send('window-max');
  const handleClose = () => (window as any).electron?.send('window-close');

  return (
    <div 
      className="h-10 bg-[rgb(var(--bg-base))] border-b border-[rgb(var(--border))] select-none flex items-center justify-between"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div className="flex items-center h-full px-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="flex items-center gap-2 mr-4">
          <button onClick={handleClose} className="w-3 h-3 rounded-full bg-[#ff5f56] hover:bg-[#ff5f56]/80 transition-colors flex items-center justify-center group" />
          <button onClick={handleMin} className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ffbd2e]/80 transition-colors flex items-center justify-center group" />
          <button onClick={handleMax} className="w-3 h-3 rounded-full bg-[#27c93f] hover:bg-[#27c93f]/80 transition-colors flex items-center justify-center group" />
        </div>
        <span className="text-[12px] font-bold text-[rgb(var(--text-secondary))] tracking-widest uppercase ml-2">
          POKEPIXEL BOT
        </span>
      </div>
    </div>
  )
}
