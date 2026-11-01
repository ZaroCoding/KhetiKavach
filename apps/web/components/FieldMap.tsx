"use client";

import maplibregl, { type ExpressionSpecification, type GeoJSONSource, type StyleSpecification } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { TerraDraw, TerraDrawPolygonMode, TerraDrawRenderMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";

import type { District, Field, GeoJSONPolygon, Severity } from "@/lib/types";

// A display basemap (no token): satellite imagery helps users trace real field edges (ruling B-12).
const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    sat: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 18,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [{ id: "sat", type: "raster", source: "sat" }],
};

const LEVEL_COLOR: ExpressionSpecification = [
  "match",
  ["get", "level"],
  "severe",
  "#7a1f12",
  "high",
  "#b3361f",
  "moderate",
  "#b07a0f",
  "low",
  "#3f7d4e",
  "#f1ebe0",
];

export interface MapTarget {
  lon: number;
  lat: number;
  zoom: number;
}

interface Props {
  fields: Field[];
  levels: Record<string, Severity>;
  districts: District[];
  selectedId: string | null;
  target: MapTarget | null;
  onSelect: (id: string) => void;
  onDrawn: (poly: GeoJSONPolygon | null) => void;
}

export default function FieldMap({ fields, levels, districts, selectedId, target, onSelect, onDrawn }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const draw = useRef<TerraDraw | null>(null);
  const callbacks = useRef({ onSelect, onDrawn });
  callbacks.current = { onSelect, onDrawn };
  const [ready, setReady] = useState(false);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    const m = new maplibregl.Map({ container: container.current, style: STYLE, center: [78.9, 22.5], zoom: 4.3 });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.on("load", () => {
      m.addSource("districts", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({
        id: "districts-line",
        type: "line",
        source: "districts",
        paint: { "line-color": "#ffd166", "line-width": 2, "line-dasharray": [2, 2] },
      });
      m.addSource("fields", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "fields-fill", type: "fill", source: "fields", paint: { "fill-color": LEVEL_COLOR, "fill-opacity": 0.4 } });
      m.addLayer({
        id: "fields-line",
        type: "line",
        source: "fields",
        paint: {
          "line-color": ["case", ["get", "selected"], "#ffffff", LEVEL_COLOR],
          "line-width": ["case", ["get", "selected"], 3, 1.5],
        },
      });
      m.on("click", "fields-fill", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (typeof id === "string" && draw.current?.getMode() !== "polygon") callbacks.current.onSelect(id);
      });
      m.on("mouseenter", "fields-fill", () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", "fields-fill", () => (m.getCanvas().style.cursor = ""));

      const td = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map: m }),
        modes: [
          new TerraDrawRenderMode({ modeName: "static", styles: {} }),
          new TerraDrawPolygonMode({ styles: { fillColor: "#ffd166", fillOpacity: 0.3, outlineColor: "#ffd166", outlineWidth: 2 } }),
        ],
      });
      td.start();
      td.setMode("static");
      td.on("finish", (id) => {
        const feature = td.getSnapshotFeature(id);
        if (feature?.geometry.type === "Polygon") {
          callbacks.current.onDrawn({ type: "Polygon", coordinates: feature.geometry.coordinates as number[][][] });
        }
        td.setMode("static");
        setDrawing(false);
      });
      draw.current = td;
      setReady(true);
    });
    map.current = m;
    return () => {
      draw.current?.stop();
      m.remove();
    };
  }, []);

  useEffect(() => {
    if (!ready || !map.current) return;
    (map.current.getSource("fields") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: fields.map((f) => ({
        type: "Feature",
        geometry: f.geometry,
        properties: { id: f.id, level: levels[f.id] ?? "unknown", selected: f.id === selectedId },
      })),
    });
    (map.current.getSource("districts") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: districts
        .filter((d) => d.bbox)
        .map((d) => {
          const [w, s, e, n] = d.bbox as [number, number, number, number];
          return {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] },
            properties: { code: d.code },
          };
        }),
    });
  }, [fields, levels, districts, selectedId, ready]);

  useEffect(() => {
    const field = fields.find((x) => x.id === selectedId);
    if (!field || !map.current) return;
    const ring = field.geometry.coordinates[0];
    const lons = ring.map((c) => c[0]);
    const lats = ring.map((c) => c[1]);
    map.current.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: 120, maxZoom: 16, duration: 900 },
    );
  }, [selectedId, fields]);

  useEffect(() => {
    if (target && map.current) map.current.flyTo({ center: [target.lon, target.lat], zoom: target.zoom, duration: 1200 });
  }, [target]);

  const startDraw = () => {
    draw.current?.clear();
    onDrawn(null);
    draw.current?.setMode("polygon");
    setDrawing(true);
  };
  const clear = () => {
    draw.current?.clear();
    draw.current?.setMode("static");
    setDrawing(false);
    onDrawn(null);
  };

  return (
    <div className="relative h-full w-full">
      <div ref={container} className="h-full w-full" />
      <div className="absolute left-3 top-3 flex gap-2">
        <button
          onClick={startDraw}
          disabled={!ready}
          className={`rounded-md px-3 py-1.5 text-sm font-medium shadow ${drawing ? "bg-amber-400 text-soil-900" : "bg-white text-soil-900 hover:bg-soil-100"}`}
        >
          {drawing ? "Drawing… double-click to finish" : "✏️ Draw field"}
        </button>
        <button onClick={clear} disabled={!ready} className="rounded-md bg-white px-3 py-1.5 text-sm shadow hover:bg-soil-100">
          Clear
        </button>
      </div>
    </div>
  );
}
