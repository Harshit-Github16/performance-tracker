"use client";

/**
 * Global reusable Card component
 * Props:
 * - image: background image url
 * - gradient: fallback gradient colors [color1, color2]
 * - badge: { label, color } top-right badge
 * - title: main heading
 * - subtitle: secondary text
 * - meta: array of { icon, text } bottom meta items
 * - onClick: click handler
 * - actions: array of { icon, onClick, title, danger }
 * - height: card height (default 200)
 */
export default function Card({
    image, gradient = ["#1e293b", "#334155"],
    badge, title, subtitle, meta = [],
    onClick, actions = [], height = 200,
    children,
}) {
    return (
        <div
            className="group relative rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.10)] cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
            style={{ height }}
            onClick={onClick}
        >
            {/* Background */}
            {image ? (
                <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${gradient[0]}cc 0%, ${gradient[1]}99 100%)` }} />
            )}

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Badge top-right */}
            {badge && (
                <div className="absolute top-3 right-3 z-10">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${badge.color || "bg-white/20 text-white"}`}>
                        {badge.dot && (
                            <span className="relative flex h-1.5 w-1.5 mr-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" style={{ animationDuration: '2s' }} />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                            </span>
                        )}
                        {badge.label}
                    </span>
                </div>
            )}

            {/* Actions top-left on hover */}
            {actions.length > 0 && (
                <div className="absolute top-3 left-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {actions.map((action, i) => (
                        <button
                            key={i}
                            onClick={(e) => { e.stopPropagation(); action.onClick?.(); }}
                            title={action.title}
                            className={`h-8 w-8 rounded-xl backdrop-blur-sm flex items-center justify-center transition-all ${action.danger ? "bg-red-500/80 text-white hover:bg-red-600" : "bg-white/20 text-white hover:bg-white/40"}`}
                        >
                            {action.icon}
                        </button>
                    ))}
                </div>
            )}

            {/* Content bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                {children ? children : (
                    <>
                        {title && <h3 className="text-white font-bold text-sm tracking-tight leading-tight mb-1 line-clamp-1">{title}</h3>}
                        {subtitle && <p className="text-white/60 text-[11px] font-semibold mb-1.5 line-clamp-1">{subtitle}</p>}
                        {meta.length > 0 && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                {meta.map((m, i) => (
                                    <div key={i} className="flex items-center gap-1 text-white/60 text-[10px] font-semibold">
                                        {m.icon && <span className="opacity-70">{m.icon}</span>}
                                        <span>{m.text}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
