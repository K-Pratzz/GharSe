// Haversine distance in km between two lat/lng points.
// Returns null if either point is missing coordinates (MVP: distance is "unknown" then,
// UI should fall back to showing locality name only).
function haversineKm(pointA, pointB) {
  if (!pointA || !pointB || pointA.lat == null || pointA.lng == null || pointB.lat == null || pointB.lng == null) {
    return null;
  }
  const R = 6371; // Earth radius km
  const dLat = toRad(pointB.lat - pointA.lat);
  const dLng = toRad(pointB.lng - pointA.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(pointA.lat)) * Math.cos(toRad(pointB.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // 1 decimal place
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

module.exports = { haversineKm };
