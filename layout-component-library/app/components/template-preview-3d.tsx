"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

const templates = [
  {
    id: "app-shell",
    name: "App Shell",
    color: "from-blue-500 to-cyan-500",
    delay: 0,
  },
  {
    id: "bento-grid",
    name: "Bento Grid",
    color: "from-purple-500 to-pink-500",
    delay: 0.15,
  },
  {
    id: "split-view",
    name: "Split View",
    color: "from-orange-500 to-red-500",
    delay: 0.3,
  },
]

export function TemplatePreview3D() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20
      const y = (e.clientY / window.innerHeight - 0.5) * 20
      setMousePosition({ x, y })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{
        perspective: "1500px",
        perspectiveOrigin: "50% 50%",
        width: "700px",
        height: "500px",
      }}
    >
      {templates.map((template, index) => {
        const verticalOffset = index * 60
        const depthOffset = index * -100
        const rotationOffset = index * -8

        return (
          <motion.div
            key={template.id}
            className="absolute"
            style={{
              left: "50%",
              top: `calc(50% + ${verticalOffset}px)`,
              transformStyle: "preserve-3d",
            }}
            initial={{ opacity: 0, y: 100, rotateX: -20 }}
            animate={{
              opacity: 1,
              y: 0,
              rotateX: rotationOffset,
              rotateY: mousePosition.x * 0.3,
            }}
            transition={{
              delay: template.delay,
              duration: 0.8,
              ease: "easeOut",
            }}
          >
            <motion.div
              className="relative h-[350px] w-[650px] overflow-hidden rounded-2xl border-2 border-border bg-card shadow-2xl"
              style={{
                transform: `translate(-50%, -50%) translateZ(${depthOffset}px)`,
              }}
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 3,
                repeat: Number.POSITIVE_INFINITY,
                delay: template.delay,
                ease: "easeInOut",
              }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${template.color} opacity-10`} />

              <TemplateMockup type={template.id} />

              <div className="absolute bottom-4 left-4 rounded-lg bg-background/80 px-4 py-2 backdrop-blur-sm">
                <p className="text-sm font-semibold">{template.name}</p>
              </div>

              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={{
                  x: ["-100%", "200%"],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: template.delay + 1,
                  ease: "linear",
                }}
              />
            </motion.div>
          </motion.div>
        )
      })}

      <div className="pointer-events-none absolute inset-0">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-primary/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Number.POSITIVE_INFINITY,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function TemplateMockup({ type }: { type: string }) {
  switch (type) {
    case "app-shell":
      return (
        <svg className="h-full w-full p-8" viewBox="0 0 700 400" fill="none">
          <rect x="20" y="20" width="120" height="360" rx="8" fill="currentColor" opacity="0.1" />
          <rect x="160" y="20" width="520" height="60" rx="8" fill="currentColor" opacity="0.15" />
          <rect x="160" y="100" width="250" height="140" rx="8" fill="currentColor" opacity="0.2" />
          <rect x="430" y="100" width="250" height="140" rx="8" fill="currentColor" opacity="0.2" />
          <rect x="160" y="260" width="520" height="120" rx="8" fill="currentColor" opacity="0.2" />
        </svg>
      )
    case "bento-grid":
      return (
        <svg className="h-full w-full p-8" viewBox="0 0 700 400" fill="none">
          <rect x="20" y="20" width="320" height="180" rx="8" fill="currentColor" opacity="0.2" />
          <rect x="360" y="20" width="320" height="80" rx="8" fill="currentColor" opacity="0.15" />
          <rect x="360" y="120" width="150" height="80" rx="8" fill="currentColor" opacity="0.1" />
          <rect x="530" y="120" width="150" height="80" rx="8" fill="currentColor" opacity="0.1" />
          <rect x="20" y="220" width="200" height="160" rx="8" fill="currentColor" opacity="0.15" />
          <rect x="240" y="220" width="440" height="160" rx="8" fill="currentColor" opacity="0.2" />
        </svg>
      )
    case "split-view":
      return (
        <svg className="h-full w-full p-8" viewBox="0 0 700 400" fill="none">
          <rect x="20" y="20" width="150" height="360" rx="8" fill="currentColor" opacity="0.1" />
          <rect x="190" y="20" width="320" height="360" rx="8" fill="currentColor" opacity="0.2" />
          <rect x="530" y="20" width="150" height="360" rx="8" fill="currentColor" opacity="0.15" />
          <rect x="175" y="180" width="4" height="40" rx="2" fill="currentColor" opacity="0.3" />
          <rect x="515" y="180" width="4" height="40" rx="2" fill="currentColor" opacity="0.3" />
        </svg>
      )
    default:
      return null
  }
}
