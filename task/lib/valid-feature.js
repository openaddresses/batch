export function isValidFeature(feature) {
    return !!(
        feature
        && feature.properties
        && typeof feature.properties === 'object'
        && feature.geometry
        && feature.geometry.type === 'Point'
        && Array.isArray(feature.geometry.coordinates)
        && feature.geometry.coordinates.length === 2
    );
}
