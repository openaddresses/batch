'use strict';

/**
 * @class Validator
 */
class Validator {
    constructor(layer) {
        this.layer = layer;

        if (layer === 'addresses') {
            this.stats = {
                valid: 0,
                failures: {
                    geometry: 0,
                    number: 0,
                    street: 0
                }
            };

            this.validate = this.addresses;
        } else if (layer === 'buildings') {
            this.validate = false;

            this.stats = {
                valid: 0,
                failures: {
                    geometry: 0
                }
            };
        } else if (layer === 'parcels') {
            this.validate = false;

            this.stats = {
                valid: 0,
                failures: {
                    geometry: 0
                }
            };
        } else {
            this.validate = false;

            this.stats = {
                valid: 0,
                failures: {
                    geometry: 0
                }
            };
        }
    }

    /**
     * Test a given feature for validity
     *
     * @param {Object} feat GeoJSON Feature to test
     *
     * @returns {Object} Standardized GeoJSON Feature
     */
    test(feat) {
        if (!this.validate) return feat;
        return this.validate(feat);
    }

    /**
     * Test a GeoJSON Address Feature for validity
     *
     * @param {Object} feat GeoJSON Address Feature to test
     *
     * @returns {Object} Standardized GeoJSON Feature
     */
    addresses(feat) {
        const errs = {
            geometry: [],
            number: [],
            street: []
        };

        if (feat.properties.number === undefined || feat.properties.number === null) {
            errs.number.push('Feat must have number property');
            feat.properties.number = '';
        }

        if (!feat.properties.number.trim().length) errs.number.push('Feat must have non-empty number property');

        feat.properties.number = feat.properties.number.toLowerCase();

        // 123 B => 123B
        if (/^\d+\s[a-z]$/.test(feat.properties.number)) feat.properties.number = feat.properties.number.replace(/\s/g, '');

        if (
            !/^\d+[a-z]?$/.test(feat.properties.number) // 10 or 10a Style
            && !/^(\d+)-(\d+)[a-z]?$/.test(feat.properties.number) // 10-19 or 10-19a Style
            && !/^(\d+)([nsew])(\d+)[a-z]?$/.test(feat.properties.number) // 6N23 Style (ie Kane County, IL)
            && !/^([nesw])(\d+)([nesw]\d+)?$/.test(feat.properties.number) // W350N5337 or N453 Style (ie Waukesha County, WI)
            && !/^\d+(к\d+)?(с\d+)?$/.test(feat.properties.number) // Russian style including korpus (cyrillic к) and stroenie (cyrillic с)
        ) errs.number.push('Feat number is not a supported address/unit type');

        if (feat.properties.number.length > 10) errs.number.push('Number should not exceed 10 chars');

        if (!feat.properties.street) {
            errs.street.push('Feat must have street property');
            feat.properties.street = '';
        }

        if (!feat.properties.street.trim().length) errs.street.push('Feat must have non-empty street property');

        if (!feat.geometry) {
            errs.geometry.push('Feature has no geometry');
        } else {
            if (isNaN(Number(feat.geometry.coordinates[0])) || feat.geometry.coordinates[0] < -180 || feat.geometry.coordinates[0] > 180) errs.geometry.push('Feat exceeds +/-180deg coord bounds');
            if (isNaN(Number(feat.geometry.coordinates[1])) || feat.geometry.coordinates[1] < -85 || feat.geometry.coordinates[1] > 85) errs.geometry.push('Feat exceeds +/-85deg coord bounds');
        }

        if (errs.geometry.length) ++this.stats.failures.geometry;
        if (errs.street.length) ++this.stats.failures.street;
        if (errs.number.length) ++this.stats.failures.number;
        if (!errs.geometry.length && !errs.street.length && !errs.number.length) {
            ++this.stats.valid;
        }

        return feat;
    }
}


module.exports = Validator;
