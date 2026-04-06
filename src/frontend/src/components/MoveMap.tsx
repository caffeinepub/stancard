// @ts-nocheck
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import { useEffect, useRef } from "react";

// Fix Leaflet default icon path issue with Vite
(L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl =
  undefined;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  color?: "gold" | "red" | "green";
}

export interface MapArc {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  color?: string;
}

interface MoveMapProps {
  markers: MapMarker[];
  arcs?: MapArc[];
  onMarkerClick?: (id: string) => void;
  height?: number;
  interactive?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

const goldIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:linear-gradient(135deg,#F2D37A,#D4AF37,#B8871A);border:2px solid rgba(255,255,255,0.3);box-shadow:0 0 8px rgba(212,175,55,0.6);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const redIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#F87171;border:2px solid rgba(255,255,255,0.3);box-shadow:0 0 8px rgba(248,113,113,0.6);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const greenIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#4ADE80;border:2px solid rgba(255,255,255,0.3);box-shadow:0 0 8px rgba(74,222,128,0.5);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function getIcon(color?: "gold" | "red" | "green") {
  if (color === "red") return redIcon;
  if (color === "green") return greenIcon;
  return goldIcon;
}

function computeCurvedArc(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  numPoints = 30,
): [number, number][] {
  const points: [number, number][] = [];
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;
  const dLat = to.lat - from.lat;
  const dLng = to.lng - from.lng;
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);
  if (dist === 0) {
    points.push([from.lat, from.lng]);
    return points;
  }
  const offsetFactor = dist * 0.3;
  const offsetLat = midLat + (-dLng / dist) * offsetFactor;
  const offsetLng = midLng + (dLat / dist) * offsetFactor;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lat =
      (1 - t) ** 2 * from.lat + 2 * (1 - t) * t * offsetLat + t ** 2 * to.lat;
    const lng =
      (1 - t) ** 2 * from.lng + 2 * (1 - t) * t * offsetLng + t ** 2 * to.lng;
    points.push([lat, lng]);
  }
  return points;
}

let mapCounter = 0;

export function MoveMap({
  markers,
  arcs = [],
  onMarkerClick,
  height = 240,
  interactive = true,
  onMapClick,
}: MoveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);
  const mapIdRef = useRef(`movemap-${++mapCounter}`);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return; // already initialized

    const map = L.map(containerRef.current, {
      zoomControl: interactive,
      scrollWheelZoom: interactive,
      dragging: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: false,
      keyboard: false,
      attributionControl: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      },
    ).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [interactive]);

  // Attach click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onMapClick) return;
    const handler = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [onMapClick]);

  // Update markers and arcs
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing layers
    for (const layer of layersRef.current) {
      map.removeLayer(layer);
    }
    layersRef.current = [];

    // Add arcs
    for (const arc of arcs) {
      const arcPoints = computeCurvedArc(arc.from, arc.to);
      const polyline = L.polyline(arcPoints, {
        color: arc.color ?? "#D4AF37",
        weight: 2,
        opacity: 0.8,
        smoothFactor: 1,
      });
      polyline.addTo(map);
      layersRef.current.push(polyline);
    }

    // Add markers
    const positions: L.LatLng[] = [];
    for (const m of markers) {
      const icon = getIcon(m.color);
      const marker = L.marker([m.lat, m.lng], { icon });
      marker.bindTooltip(m.label, {
        permanent: false,
        direction: "top",
        className: "move-map-tooltip",
      });
      if (onMarkerClick) {
        marker.on("click", () => onMarkerClick(m.id));
      }
      marker.addTo(map);
      layersRef.current.push(marker);
      positions.push(L.latLng(m.lat, m.lng));
    }

    // Fit bounds
    if (positions.length >= 2) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [32, 32], animate: false });
    } else if (positions.length === 1) {
      map.setView(positions[0], 10, { animate: false });
    } else {
      map.setView([20, 0], 2, { animate: false });
    }

    // Force re-render after bounds change
    setTimeout(() => {
      map.invalidateSize();
    }, 50);
  }, [markers, arcs, onMarkerClick]);

  return (
    <div
      style={{
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(212,175,55,0.2)",
        height,
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div
        ref={containerRef}
        id={mapIdRef.current}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
