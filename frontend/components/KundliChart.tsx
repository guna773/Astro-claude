'use client'

import React from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Planet {
  name: string
  house: number
  sign: string
  degree: number
}

interface KundliChartProps {
  planets?: Planet[]
  lagna?: string
  size?: number
}

// ─── Planet abbreviations ─────────────────────────────────────────────────────

const PLANET_ABBR: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me',
  Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
}

// ─── North Indian house layout ────────────────────────────────────────────────
// The North Indian chart has a fixed 4×4 grid with 12 rhombus-ish cells.
// We define each house as a polygon (points as fractions of the 400px viewbox).
// House 1 = top center diamond, going clockwise.

const W = 400
const H = 400
const G = W / 4 // grid unit = 100

// Corner points of the outer square
const TL = { x: 0,   y: 0   }
const TR = { x: W,   y: 0   }
const BL = { x: 0,   y: H   }
const BR = { x: W,   y: H   }

// Mid-points of outer edges
const MT = { x: W/2, y: 0   }
const MB = { x: W/2, y: H   }
const ML = { x: 0,   y: H/2 }
const MR = { x: W,   y: H/2 }

// Centre
const C  = { x: W/2, y: H/2 }

// Inner square corners (offset 1 grid unit from each outer corner)
const ITL = { x: G,   y: G   }
const ITR = { x: W-G, y: G   }
const IBL = { x: G,   y: H-G }
const IBR = { x: W-G, y: H-G }

type Pt = { x: number; y: number }

function pts(...points: Pt[]) {
  return points.map((p) => `${p.x},${p.y}`).join(' ')
}

function midpoint(a: Pt, b: Pt, t = 0.5): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

// Label centroid of a polygon
function centroid(points: Pt[]): Pt {
  const x = points.reduce((s, p) => s + p.x, 0) / points.length
  const y = points.reduce((s, p) => s + p.y, 0) / points.length
  return { x, y }
}

// House definitions (12 polygons, North Indian style, clockwise from top)
const housePolygons: Pt[][] = [
  // House 1 – top-center diamond
  [MT, ITR, C, ITL],
  // House 2 – top-right triangle
  [MT, TR, ITR],
  // House 3 – right-top triangle
  [TR, MR, ITR],
  // House 4 – right-center diamond
  [MR, IBR, C, ITR],
  // House 5 – right-bottom triangle
  [MR, BR, IBR],
  // House 6 – bottom-right triangle
  [BR, MB, IBR],
  // House 7 – bottom-center diamond
  [MB, IBL, C, IBR],
  // House 8 – bottom-left triangle
  [MB, BL, IBL],
  // House 9 – left-bottom triangle
  [BL, ML, IBL],
  // House 10 – left-center diamond
  [ML, ITL, C, IBL],
  // House 11 – left-top triangle
  [ML, TL, ITL],
  // House 12 – top-left triangle
  [TL, MT, ITL],
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function KundliChart({ planets = [], lagna = 'Aries', size = 400 }: KundliChartProps) {
  // Group planets by house
  const planetsByHouse: Record<number, string[]> = {}
  for (let h = 1; h <= 12; h++) planetsByHouse[h] = []

  planets.forEach((p) => {
    const house = Math.min(Math.max(p.house, 1), 12)
    const abbr = PLANET_ABBR[p.name] || p.name.slice(0, 2)
    planetsByHouse[house].push(abbr)
  })

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={size}
        height={size}
        style={{ maxWidth: '100%', height: 'auto' }}
        aria-label="North Indian Kundli Chart"
      >
        {/* Background */}
        <rect width={W} height={H} fill="#0a0a1a" rx="8" />

        {/* House polygons */}
        {housePolygons.map((poly, idx) => {
          const houseNum = idx + 1
          const center = centroid(poly)
          const planetsHere = planetsByHouse[houseNum] || []
          const isLagna = houseNum === 1

          return (
            <g key={houseNum}>
              <polygon
                points={pts(...poly)}
                fill={isLagna ? 'rgba(201,168,76,0.08)' : 'rgba(26,26,46,0.6)'}
                stroke="#c9a84c"
                strokeWidth={isLagna ? 1.5 : 0.8}
                strokeOpacity={isLagna ? 0.8 : 0.45}
              />

              {/* House number */}
              <text
                x={center.x}
                y={center.y - (planetsHere.length > 0 ? 10 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={isLagna ? 14 : 11}
                fontWeight={isLagna ? '700' : '400'}
                fill={isLagna ? '#c9a84c' : 'rgba(201,168,76,0.5)'}
                fontFamily="Cinzel, Georgia, serif"
              >
                {houseNum}
              </text>

              {/* Planet abbreviations */}
              {planetsHere.map((abbr, pIdx) => (
                <text
                  key={abbr + pIdx}
                  x={center.x}
                  y={center.y + 6 + pIdx * 14}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight="600"
                  fill="#f0d070"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {abbr}
                </text>
              ))}
            </g>
          )
        })}

        {/* Outer border */}
        <rect
          width={W}
          height={H}
          fill="none"
          stroke="#c9a84c"
          strokeWidth={1.5}
          strokeOpacity={0.6}
          rx="8"
        />

        {/* Center cross lines */}
        <line x1={ML.x} y1={ML.y} x2={MR.x} y2={MR.y} stroke="#c9a84c" strokeWidth={0.6} strokeOpacity={0.25} />
        <line x1={MT.x} y1={MT.y} x2={MB.x} y2={MB.y} stroke="#c9a84c" strokeWidth={0.6} strokeOpacity={0.25} />
        <line x1={TL.x} y1={TL.y} x2={BR.x} y2={BR.y} stroke="#c9a84c" strokeWidth={0.6} strokeOpacity={0.25} />
        <line x1={TR.x} y1={TR.y} x2={BL.x} y2={BL.y} stroke="#c9a84c" strokeWidth={0.6} strokeOpacity={0.25} />

        {/* Lagna label in house 1 center */}
        <text
          x={centroid(housePolygons[0]).x}
          y={centroid(housePolygons[0]).y + 22}
          textAnchor="middle"
          fontSize={8}
          fill="rgba(201,168,76,0.7)"
          fontFamily="Inter, system-ui, sans-serif"
          letterSpacing="0.05em"
        >
          {lagna.slice(0, 3).toUpperCase()}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-2 mt-1">
        {Object.entries(PLANET_ABBR).map(([full, abbr]) => (
          <span
            key={full}
            className="text-xs px-2 py-0.5 rounded"
            style={{
              background: 'rgba(201,168,76,0.08)',
              border: '1px solid rgba(201,168,76,0.2)',
              color: '#f0d070',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {abbr} = {full}
          </span>
        ))}
      </div>
    </div>
  )
}
