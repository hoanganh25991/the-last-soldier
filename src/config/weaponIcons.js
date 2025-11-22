/**
 * Weapon Icon Configuration
 * Consistent icon definitions for all weapons across the game
 */

export const WEAPON_ICONS = {
    // Primary weapons (long guns/rifles)
    longGun: 'ᡕᠵデᡁ᠊╾━',
    
    // Secondary weapons (pistols)
    pistol: ' ̸̳̔̎​̎̎ ̿̿̅̅/ ̔̅̅ ̿̿ ̿̿ ̿ ̿̿ ̿̿̅̅ ̿̿',
    
    // Melee weapons
    knife: '▬ι𓆃',
    
    // Gadgets
    grenade: '💣',
    medkit: '🏥',
    binoculars: '🔭'
};

/**
 * Get icon for weapon type
 * @param {string} weaponName - Name of the weapon (MP40, Sten, Pistol, Luger, etc.)
 * @returns {string} Icon string
 */
export function getWeaponIcon(weaponName) {
    const iconMap = {
        // Primary weapons (long guns)
        'MP40': WEAPON_ICONS.longGun,
        'Sten': WEAPON_ICONS.longGun,
        'Rifle': WEAPON_ICONS.longGun,
        
        // Secondary weapons (pistols)
        'Pistol': WEAPON_ICONS.pistol,
        'Luger': WEAPON_ICONS.pistol,
        
        // Gadgets
        'Grenade': WEAPON_ICONS.grenade,
        'Medkit': WEAPON_ICONS.medkit,
        'Binoculars': WEAPON_ICONS.binoculars
    };
    
    return iconMap[weaponName] || WEAPON_ICONS.pistol;
}

/**
 * Get icon for weapon category type
 * @param {string} type - 'primary', 'secondary', or 'gadget'
 * @param {string} weaponName - Optional weapon name for gadgets
 * @returns {string} Icon string
 */
export function getWeaponIconByType(type, weaponName = null) {
    if (type === 'primary') {
        return WEAPON_ICONS.longGun;
    } else if (type === 'secondary') {
        return WEAPON_ICONS.pistol;
    } else if (type === 'gadget' && weaponName) {
        return getWeaponIcon(weaponName);
    }
    return WEAPON_ICONS.pistol;
}

