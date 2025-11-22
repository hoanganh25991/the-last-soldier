import * as THREE from 'three';

/**
 * Creates a 3D soldier model with walk animation support
 * @param {THREE.Color|number} teamColor - Color for the soldier (blue for allies, red for enemies)
 * @returns {Object} Object containing the soldier group and animation references
 */
export function createSoldierModel(teamColor = 0x654321) {
    const soldierGroup = new THREE.Group();
    
    // Convert color to THREE.Color if it's a hex number
    const color = teamColor instanceof THREE.Color ? teamColor : new THREE.Color(teamColor);
    
    // Body (torso)
    const bodyGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.3);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.0;
    body.castShadow = true;
    soldierGroup.add(body);

    // Head
    const headGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac }); // Skin color (keep original)
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    head.castShadow = true;
    soldierGroup.add(head);

    // Helmet
    const helmetGeometry = new THREE.BoxGeometry(0.35, 0.2, 0.35);
    const helmetMaterial = new THREE.MeshLambertMaterial({ color: color });
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.y = 1.6;
    helmet.castShadow = true;
    soldierGroup.add(helmet);

    // Left arm
    const leftArmGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    const armMaterial = new THREE.MeshLambertMaterial({ color: color });
    const leftArm = new THREE.Mesh(leftArmGeometry, armMaterial);
    leftArm.position.set(-0.3, 1.0, 0);
    leftArm.castShadow = true;
    soldierGroup.add(leftArm);

    // Right arm
    const rightArm = new THREE.Mesh(leftArmGeometry, armMaterial);
    rightArm.position.set(0.3, 1.0, 0);
    rightArm.castShadow = true;
    soldierGroup.add(rightArm);

    // Left leg
    const leftLegGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const legMaterial = new THREE.MeshLambertMaterial({ color: color });
    const leftLeg = new THREE.Mesh(leftLegGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0.3, 0);
    leftLeg.castShadow = true;
    soldierGroup.add(leftLeg);

    // Right leg
    const rightLeg = new THREE.Mesh(leftLegGeometry, legMaterial);
    rightLeg.position.set(0.15, 0.3, 0);
    rightLeg.castShadow = true;
    soldierGroup.add(rightLeg);

    // Primary weapon (rifle) - similar to player's weapon
    const rifleGroup = new THREE.Group();
    
    // Barrel
    const barrelGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.8);
    const barrelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.set(0, 0, -0.4);
    rifleGroup.add(barrel);
    
    // Stock
    const stockGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.3);
    const stockMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.set(0, 0, 0.15);
    rifleGroup.add(stock);
    
    // Body
    const rifleBodyGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.6);
    const rifleBodyMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const rifleBody = new THREE.Mesh(rifleBodyGeometry, rifleBodyMaterial);
    rifleBody.position.set(0, 0, -0.1);
    rifleGroup.add(rifleBody);
    
    // Grip
    const gripGeometry = new THREE.BoxGeometry(0.15, 0.2, 0.25);
    const gripMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, -0.1, -0.05);
    grip.castShadow = true;
    rifleGroup.add(grip);
    
    // Position rifle in soldier's hands
    rifleGroup.position.set(0.25, 0.9, -0.15);
    rifleGroup.rotation.z = -0.1;
    rifleGroup.castShadow = true;
    soldierGroup.add(rifleGroup);

    // Store references for animation
    return {
        group: soldierGroup,
        leftArm: leftArm,
        rightArm: rightArm,
        leftLeg: leftLeg,
        rightLeg: rightLeg,
        body: body,
        head: head,
        helmet: helmet,
        rifle: rifleGroup
    };
}

/**
 * Updates walk animation for a soldier
 * @param {Object} soldierData - Soldier data object from createSoldierModel
 * @param {number} elapsedTime - Elapsed time for animation
 * @param {number} runSpeed - Animation speed multiplier (default: 8)
 */
export function updateWalkAnimation(soldierData, elapsedTime, runSpeed = 8) {
    if (!soldierData || !soldierData.leftLeg || !soldierData.rightLeg) return;
    
    // Legs running motion
    if (soldierData.leftLeg) {
        soldierData.leftLeg.rotation.x = Math.sin(elapsedTime * runSpeed) * 0.5;
    }
    if (soldierData.rightLeg) {
        soldierData.rightLeg.rotation.x = -Math.sin(elapsedTime * runSpeed) * 0.5;
    }

    // Arms running motion (opposite to legs)
    if (soldierData.leftArm) {
        soldierData.leftArm.rotation.x = -Math.sin(elapsedTime * runSpeed) * 0.3;
    }
    if (soldierData.rightArm) {
        soldierData.rightArm.rotation.x = Math.sin(elapsedTime * runSpeed) * 0.3;
    }

    // Slight body bob
    if (soldierData.group) {
        soldierData.group.position.y = Math.abs(Math.sin(elapsedTime * runSpeed)) * 0.1;
    }
}

