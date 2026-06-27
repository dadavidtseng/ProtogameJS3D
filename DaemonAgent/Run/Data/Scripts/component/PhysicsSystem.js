//----------------------------------------------------------------------------------------------------
// PhysicsSystem.js - Physics Simulation System
// JavaScript-based physics for rapid prototyping and experimental features
//----------------------------------------------------------------------------------------------------

import {EntityAPI} from '../Interface/EntityAPI.js';

/**
 * PhysicsSystem - Gravity, collision detection, and bounce simulation for entities
 *
 * This is a JavaScript-based physics system for experimental features.
 * Simulates basic gravity, ground collision, and bounce behavior.
 *
 * Design Principles (Hybrid Approach):
 * - Phase 1: JavaScript implementation for rapid prototyping
 * - Phase 2: Can be migrated to C++ PhysicsAPI if needed
 * - Hot-reload friendly for parameter tweaking
 * - Optimized for ~100 entities with spatial grid partitioning
 *
 * Physics Model:
 * - Constant gravity: -9.8 m/s² (downward in Z-axis)
 * - Ground collision at Z=0 (grid surface)
 * - Inter-object collision detection (AABB for cubes, sphere for spheres)
 * - Spatial grid optimization for O(n) collision detection
 * - Partially elastic collisions with friction (restitution: 0.7, friction: 0.15)
 *
 * Usage:
 * ```javascript
 * const physics = new PhysicsSystem();
 * physics.addEntity(entityId, {
 *     gravity: -9.8,
 *     bounciness: 0.7,
 *     mass: 1.0
 * });
 * physics.update(deltaTime); // Called every frame
 * ```
 */
export class PhysicsSystem
{
    // Version tracking for hot-reload
    static version = 8;  // Version 8: Increased separation bias to reduce overlap

    constructor()
    {
        console.log('PhysicsSystem: Initializing physics system with collision detection...');

        // Entity registry: Map<entityId, PhysicsData>
        this.entities = new Map();

        // EntityAPI for position updates
        this.entityAPI = new EntityAPI();

        // Physics constants
        this.GROUND_LEVEL = 0.0;  // Grid surface at Z=0
        this.MIN_BOUNCE_VELOCITY = 0.01;  // Stop bouncing if velocity too low

        // Collision response constants
        this.RESTITUTION = 0.7;   // Partially elastic (bouncy like rubber ball)
        this.FRICTION = 0.15;     // Low friction coefficient (smooth surfaces)

        // Spatial grid optimization
        this.GRID_CELL_SIZE = 3.0;  // 3 meter cells for spatial partitioning
        this.spatialGrid = new Map();  // Map<gridKey, Set<entityId>>

        // Debug tracking
        this.collisionCount = 0;
        this.boxBoxCollisions = 0;
        this.sphereSphereCollisions = 0;
        this.boxSphereCollisions = 0;
        this.lastCollisionLogTime = 0;

        console.log('PhysicsSystem: Physics system initialized with collision detection');
        console.log(`  Restitution: ${this.RESTITUTION}, Friction: ${this.FRICTION}`);
        console.log(`  Spatial grid cell size: ${this.GRID_CELL_SIZE} meters`);
    }

    /**
     * Add entity to physics simulation
     * @param {number} entityId - Entity ID from EntityAPI
     * @param {Object} config - Physics configuration
     * @param {number} config.gravity - Gravity acceleration (default: -9.8 m/s²)
     * @param {number} config.bounciness - Bounce energy retention 0-1 (default: 0.7)
     * @param {number} config.mass - Entity mass in kg (default: 1.0)
     * @param {Array<number>} config.initialPosition - Initial [x, y, z] position
     * @param {Array<number>} config.initialVelocity - Initial [vx, vy, vz] velocity in m/s (optional)
     * @param {Object} config.gameObject - Reference to GameObject for position sync (optional)
     */
    addEntity(entityId, config = {})
    {
        if (!entityId || entityId === 0)
        {
            console.log('PhysicsSystem: ERROR - Invalid entity ID:', entityId);
            return;
        }

        // Determine collision shape from gameObject mesh type
        let collisionShape = 'sphere';  // Default
        let collisionRadius = 0.5;
        let collisionHalfExtents = [0.5, 0.5, 0.5];

        if (config.gameObject && config.gameObject.mesh)
        {
            const meshType = config.gameObject.mesh.meshType;
            if (meshType === 'cube')
            {
                collisionShape = 'box';
                // Scale collision box by object scale
                const scale = config.gameObject.mesh.scale || 1.0;
                collisionHalfExtents = [0.5 * scale, 0.5 * scale, 0.5 * scale];
            }
            else if (meshType === 'sphere')
            {
                collisionShape = 'sphere';
                const scale = config.gameObject.mesh.scale || 1.0;
                collisionRadius = 0.5 * scale;
            }
        }

        const physicsData = {
            entityId: entityId,

            // Position and velocity (in world space: X-forward, Y-left, Z-up)
            position: config.initialPosition || [0, 0, 5],  // Start above ground
            velocity: config.initialVelocity || [0, 0, 0],  // [vx, vy, vz] in m/s

            // Physics parameters
            gravity: config.gravity !== undefined ? config.gravity : -9.8,  // m/s²
            bounciness: config.bounciness !== undefined ? config.bounciness : 0.7,  // Energy retention
            mass: config.mass !== undefined ? config.mass : 1.0,  // kg

            // Collision shape data
            collisionShape: collisionShape,
            collisionRadius: collisionRadius,
            collisionHalfExtents: collisionHalfExtents,

            // GameObject reference (for position sync)
            gameObject: config.gameObject || null,

            // State flags
            isGrounded: false,
            isBouncing: true
        };

        this.entities.set(entityId, physicsData);

        console.log(`PhysicsSystem: Added entity ${entityId} to physics simulation`);
        console.log(`  Initial position: [${physicsData.position}]`);
        console.log(`  Initial velocity: [${physicsData.velocity}]`);
        console.log(`  Collision shape: ${collisionShape}`);
        console.log(`  Gravity: ${physicsData.gravity} m/s²`);
        console.log(`  Bounciness: ${physicsData.bounciness}`);
    }

    /**
     * Remove entity from physics simulation
     * @param {number} entityId - Entity ID to remove
     */
    removeEntity(entityId)
    {
        const removed = this.entities.delete(entityId);
        if (removed)
        {
            console.log(`PhysicsSystem: Removed entity ${entityId} from physics simulation`);
        }
        return removed;
    }

    /**
     * Get spatial grid key for a position
     * @param {Array<number>} position - [x, y, z] world position
     * @returns {string} Grid key "x_y_z"
     */
    getSpatialGridKey(position)
    {
        const gridX = Math.floor(position[0] / this.GRID_CELL_SIZE);
        const gridY = Math.floor(position[1] / this.GRID_CELL_SIZE);
        const gridZ = Math.floor(position[2] / this.GRID_CELL_SIZE);
        return `${gridX}_${gridY}_${gridZ}`;
    }

    /**
     * Update spatial grid for collision optimization
     */
    updateSpatialGrid()
    {
        // Clear spatial grid
        this.spatialGrid.clear();

        // Insert all entities into grid
        for (const [entityId, data] of this.entities)
        {
            const gridKey = this.getSpatialGridKey(data.position);

            if (!this.spatialGrid.has(gridKey))
            {
                this.spatialGrid.set(gridKey, new Set());
            }

            this.spatialGrid.get(gridKey).add(entityId);
        }
    }

    /**
     * Get nearby entities in adjacent grid cells
     * @param {Array<number>} position - Entity position
     * @returns {Array<number>} Array of nearby entity IDs
     */
    getNearbyEntities(position)
    {
        const nearbyEntities = new Set();

        // Check 3×3×3 grid cells around entity
        const gridX = Math.floor(position[0] / this.GRID_CELL_SIZE);
        const gridY = Math.floor(position[1] / this.GRID_CELL_SIZE);
        const gridZ = Math.floor(position[2] / this.GRID_CELL_SIZE);

        for (let dx = -1; dx <= 1; dx++)
        {
            for (let dy = -1; dy <= 1; dy++)
            {
                for (let dz = -1; dz <= 1; dz++)
                {
                    const key = `${gridX + dx}_${gridY + dy}_${gridZ + dz}`;
                    const cellEntities = this.spatialGrid.get(key);

                    if (cellEntities)
                    {
                        cellEntities.forEach(id => nearbyEntities.add(id));
                    }
                }
            }
        }

        return Array.from(nearbyEntities);
    }

    /**
     * Check AABB collision between two boxes
     * @param {Array<number>} posA - Position of box A
     * @param {Array<number>} halfExtentsA - Half extents of box A
     * @param {Array<number>} posB - Position of box B
     * @param {Array<number>} halfExtentsB - Half extents of box B
     * @returns {Object|null} Collision data or null if no collision
     */
    checkAABBCollision(posA, halfExtentsA, posB, halfExtentsB)
    {
        // Calculate overlap on each axis
        const overlapX = (halfExtentsA[0] + halfExtentsB[0]) - Math.abs(posA[0] - posB[0]);
        const overlapY = (halfExtentsA[1] + halfExtentsB[1]) - Math.abs(posA[1] - posB[1]);
        const overlapZ = (halfExtentsA[2] + halfExtentsB[2]) - Math.abs(posA[2] - posB[2]);

        // Check if all axes overlap
        if (overlapX > 0 && overlapY > 0 && overlapZ > 0)
        {
            // Find axis of minimum penetration (collision normal)
            const minOverlap = Math.min(overlapX, overlapY, overlapZ);
            let normal = [0, 0, 0];

            if (minOverlap === overlapX)
            {
                normal[0] = posA[0] > posB[0] ? 1 : -1;
            }
            else if (minOverlap === overlapY)
            {
                normal[1] = posA[1] > posB[1] ? 1 : -1;
            }
            else
            {
                normal[2] = posA[2] > posB[2] ? 1 : -1;
            }

            return {
                penetrationDepth: minOverlap,
                normal: normal
            };
        }

        return null;
    }

    /**
     * Check sphere collision between two spheres
     * @param {Array<number>} posA - Position of sphere A
     * @param {number} radiusA - Radius of sphere A
     * @param {Array<number>} posB - Position of sphere B
     * @param {number} radiusB - Radius of sphere B
     * @returns {Object|null} Collision data or null if no collision
     */
    checkSphereCollision(posA, radiusA, posB, radiusB)
    {
        // Calculate distance between centers
        const dx = posA[0] - posB[0];
        const dy = posA[1] - posB[1];
        const dz = posA[2] - posB[2];
        const distanceSq = dx * dx + dy * dy + dz * dz;
        const minDistance = radiusA + radiusB;

        // Check if spheres overlap
        if (distanceSq < minDistance * minDistance && distanceSq > 0)
        {
            const distance = Math.sqrt(distanceSq);
            const penetrationDepth = minDistance - distance;

            // Normal points from B to A
            const normal = [
                dx / distance,
                dy / distance,
                dz / distance
            ];

            return {
                penetrationDepth: penetrationDepth,
                normal: normal
            };
        }

        return null;
    }

    /**
     * Check box-sphere collision
     * @param {Array<number>} boxPos - Position of box center
     * @param {Array<number>} halfExtents - Half extents of box [hx, hy, hz]
     * @param {Array<number>} spherePos - Position of sphere center
     * @param {number} radius - Radius of sphere
     * @param {boolean} boxIsA - True if box is entity A (affects normal direction)
     * @returns {Object|null} Collision data or null if no collision
     */
    checkBoxSphereCollision(boxPos, halfExtents, spherePos, radius, boxIsA = true)
    {
        // Find closest point on AABB to sphere center
        const closestX = Math.max(boxPos[0] - halfExtents[0], Math.min(spherePos[0], boxPos[0] + halfExtents[0]));
        const closestY = Math.max(boxPos[1] - halfExtents[1], Math.min(spherePos[1], boxPos[1] + halfExtents[1]));
        const closestZ = Math.max(boxPos[2] - halfExtents[2], Math.min(spherePos[2], boxPos[2] + halfExtents[2]));

        // Calculate vector from closest point to sphere center
        const dx = spherePos[0] - closestX;
        const dy = spherePos[1] - closestY;
        const dz = spherePos[2] - closestZ;
        const distanceSq = dx * dx + dy * dy + dz * dz;

        // Check if collision exists
        if (distanceSq < radius * radius)
        {
            // Special case: sphere center inside box
            if (distanceSq < 0.0001)
            {
                // Push sphere out along closest axis
                const diffX = Math.abs(spherePos[0] - boxPos[0]);
                const diffY = Math.abs(spherePos[1] - boxPos[1]);
                const diffZ = Math.abs(spherePos[2] - boxPos[2]);

                const penetrationX = halfExtents[0] + radius - diffX;
                const penetrationY = halfExtents[1] + radius - diffY;
                const penetrationZ = halfExtents[2] + radius - diffZ;

                let normal = [0, 0, 0];
                let penetrationDepth = 0;

                if (penetrationX < penetrationY && penetrationX < penetrationZ)
                {
                    penetrationDepth = penetrationX;
                    // Natural direction: points from box center to sphere center (box→sphere)
                    normal[0] = spherePos[0] > boxPos[0] ? 1 : -1;
                }
                else if (penetrationY < penetrationZ)
                {
                    penetrationDepth = penetrationY;
                    normal[1] = spherePos[1] > boxPos[1] ? 1 : -1;
                }
                else
                {
                    penetrationDepth = penetrationZ;
                    normal[2] = spherePos[2] > boxPos[2] ? 1 : -1;
                }

                // Convention: ALL collision normals point FROM B TO A
                // Natural normal points box→sphere, same logic as normal case
                if (boxIsA)
                {
                    // Box is A, sphere is B: flip to get B→A (sphere→box)
                    normal[0] = -normal[0];
                    normal[1] = -normal[1];
                    normal[2] = -normal[2];
                }
                // else: sphere is A, box is B: natural direction already B→A (box→sphere)

                return {
                    penetrationDepth: penetrationDepth,
                    normal: normal
                };
            }

            // Normal case: sphere center outside box
            const distance = Math.sqrt(distanceSq);
            const penetrationDepth = radius - distance;

            // Natural normal: closest point on box → sphere center (box→sphere direction)
            let normal = [
                dx / distance,
                dy / distance,
                dz / distance
            ];

            // Convention: ALL collision normals point FROM B TO A
            // - If box is A, sphere is B: need normal to point sphere→box (B→A)
            //   but natural direction is box→sphere, so FLIP IT
            // - If sphere is A, box is B: need normal to point box→sphere (B→A)
            //   and natural direction is box→sphere, so KEEP IT
            if (boxIsA)
            {
                // Box is A, sphere is B: flip to get B→A (sphere→box)
                normal[0] = -normal[0];
                normal[1] = -normal[1];
                normal[2] = -normal[2];
            }
            // else: sphere is A, box is B: natural direction already B→A (box→sphere)

            return {
                penetrationDepth: penetrationDepth,
                normal: normal
            };
        }

        return null;
    }

    /**
     * Apply collision response between two entities
     * @param {Object} dataA - Physics data for entity A
     * @param {Object} dataB - Physics data for entity B
     * @param {Object} collision - Collision data (penetrationDepth, normal)
     */
    applyCollisionResponse(dataA, dataB, collision)
    {
        const { penetrationDepth, normal } = collision;

        // Add bias to prevent objects from resting in contact (bounce separation)
        const SEPARATION_BIAS = 0.15;  // 15cm bias to ensure clean separation (increased from 5cm to reduce overlap)

        // Separate entities to resolve penetration with extra bias
        // IMPORTANT: All collision normals point FROM B TO A (verified in AABB and sphere functions)
        // Therefore:
        // - A should move in +normal direction (away from B toward A)
        // - B should move in -normal direction (away from A toward B)
        const totalMass = dataA.mass + dataB.mass;
        const separationDistance = penetrationDepth + SEPARATION_BIAS;
        const separationA = separationDistance * (dataB.mass / totalMass);
        const separationB = separationDistance * (dataA.mass / totalMass);

        dataA.position[0] += normal[0] * separationA;  // A moves in +normal (away from B)
        dataA.position[1] += normal[1] * separationA;
        dataA.position[2] += normal[2] * separationA;

        dataB.position[0] -= normal[0] * separationB;  // B moves in -normal (away from A)
        dataB.position[1] -= normal[1] * separationB;
        dataB.position[2] -= normal[2] * separationB;

        // Calculate relative velocity
        const relVelX = dataA.velocity[0] - dataB.velocity[0];
        const relVelY = dataA.velocity[1] - dataB.velocity[1];
        const relVelZ = dataA.velocity[2] - dataB.velocity[2];

        // Calculate relative velocity along collision normal
        const velAlongNormal = relVelX * normal[0] + relVelY * normal[1] + relVelZ * normal[2];

        // Objects moving apart, no collision response needed
        if (velAlongNormal > 0) return;

        // Calculate impulse scalar using proper mass distribution
        // j = -(1 + e) * vRel · n / (1/mA + 1/mB)
        const invMassSum = (1.0 / dataA.mass) + (1.0 / dataB.mass);
        const impulseScalar = -(1.0 + this.RESTITUTION) * velAlongNormal / invMassSum;

        // Apply impulse to velocities (Newton's third law)
        const impulseX = impulseScalar * normal[0];
        const impulseY = impulseScalar * normal[1];
        const impulseZ = impulseScalar * normal[2];

        dataA.velocity[0] += impulseX / dataA.mass;
        dataA.velocity[1] += impulseY / dataA.mass;
        dataA.velocity[2] += impulseZ / dataA.mass;

        dataB.velocity[0] -= impulseX / dataB.mass;
        dataB.velocity[1] -= impulseY / dataB.mass;
        dataB.velocity[2] -= impulseZ / dataB.mass;

        // Apply friction (tangential impulse) - Coulomb friction model
        const tangentX = relVelX - velAlongNormal * normal[0];
        const tangentY = relVelY - velAlongNormal * normal[1];
        const tangentZ = relVelZ - velAlongNormal * normal[2];

        const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY + tangentZ * tangentZ);

        if (tangentLength > 0.001)
        {
            const tangentNormX = tangentX / tangentLength;
            const tangentNormY = tangentY / tangentLength;
            const tangentNormZ = tangentZ / tangentLength;

            // Coulomb friction: magnitude limited by μ * normalImpulse
            const frictionImpulseScalar = -Math.min(
                this.FRICTION * Math.abs(impulseScalar),
                tangentLength / invMassSum
            );

            const frictionImpulseX = frictionImpulseScalar * tangentNormX;
            const frictionImpulseY = frictionImpulseScalar * tangentNormY;
            const frictionImpulseZ = frictionImpulseScalar * tangentNormZ;

            dataA.velocity[0] += frictionImpulseX / dataA.mass;
            dataA.velocity[1] += frictionImpulseY / dataA.mass;
            dataA.velocity[2] += frictionImpulseZ / dataA.mass;

            dataB.velocity[0] -= frictionImpulseX / dataB.mass;
            dataB.velocity[1] -= frictionImpulseY / dataB.mass;
            dataB.velocity[2] -= frictionImpulseZ / dataB.mass;
        }
    }

    /**
     * Update physics simulation (called every frame)
     * @param {number} deltaTime - Frame time in milliseconds
     */
    async update(deltaTime)
    {
        // Convert deltaTime from milliseconds to seconds
        const dt = deltaTime / 1000.0;

        // Step 1: Apply gravity and integrate velocity (but don't update positions yet)
        for (const [entityId, data] of this.entities)
        {
            // Skip if entity is grounded and not bouncing
            if (data.isGrounded && !data.isBouncing)
            {
                continue;
            }

            // Apply gravity to velocity (integrate acceleration)
            data.velocity[2] += data.gravity * dt;
        }

        // Step 2: Integrate velocity to compute NEW positions (but don't send to EntityAPI yet)
        const newPositions = new Map();
        for (const [entityId, data] of this.entities)
        {
            if (data.isGrounded && !data.isBouncing)
            {
                newPositions.set(entityId, [...data.position]);
                continue;
            }

            // Calculate new position based on velocity
            const newPos = [
                data.position[0] + data.velocity[0] * dt,
                data.position[1] + data.velocity[1] * dt,
                data.position[2] + data.velocity[2] * dt
            ];
            newPositions.set(entityId, newPos);
        }

        // Step 3: Update positions to new positions for collision detection
        for (const [entityId, newPos] of newPositions)
        {
            const data = this.entities.get(entityId);
            data.position[0] = newPos[0];
            data.position[1] = newPos[1];
            data.position[2] = newPos[2];
        }

        // Step 4: Update spatial grid with NEW positions
        this.updateSpatialGrid();

        // Step 5: Check collisions and apply responses
        const checkedPairs = new Set();

        for (const [entityIdA, dataA] of this.entities)
        {
            // Get nearby entities for collision checks
            const nearbyIds = this.getNearbyEntities(dataA.position);

            for (const entityIdB of nearbyIds)
            {
                // Skip self-collision
                if (entityIdA === entityIdB) continue;

                // Skip if pair already checked
                const pairKey = entityIdA < entityIdB
                    ? `${entityIdA}_${entityIdB}`
                    : `${entityIdB}_${entityIdA}`;

                if (checkedPairs.has(pairKey)) continue;
                checkedPairs.add(pairKey);

                const dataB = this.entities.get(entityIdB);
                if (!dataB) continue;

                // Check collision based on shape types
                let collision = null;

                if (dataA.collisionShape === 'box' && dataB.collisionShape === 'box')
                {
                    collision = this.checkAABBCollision(
                        dataA.position, dataA.collisionHalfExtents,
                        dataB.position, dataB.collisionHalfExtents
                    );
                    if (collision) this.boxBoxCollisions++;
                }
                else if (dataA.collisionShape === 'sphere' && dataB.collisionShape === 'sphere')
                {
                    collision = this.checkSphereCollision(
                        dataA.position, dataA.collisionRadius,
                        dataB.position, dataB.collisionRadius
                    );
                    if (collision) this.sphereSphereCollisions++;
                }
                else if (dataA.collisionShape === 'box' && dataB.collisionShape === 'sphere')
                {
                    // Box is A, sphere is B -> boxIsA = true
                    collision = this.checkBoxSphereCollision(
                        dataA.position, dataA.collisionHalfExtents,
                        dataB.position, dataB.collisionRadius,
                        true  // boxIsA = true
                    );
                    if (collision) this.boxSphereCollisions++;
                }
                else if (dataA.collisionShape === 'sphere' && dataB.collisionShape === 'box')
                {
                    // Sphere is A, box is B -> boxIsA = false
                    collision = this.checkBoxSphereCollision(
                        dataB.position, dataB.collisionHalfExtents,
                        dataA.position, dataA.collisionRadius,
                        false  // boxIsA = false (normal flips internally)
                    );
                    if (collision) this.boxSphereCollisions++;
                }

                // Apply collision response if collision detected
                if (collision)
                {
                    this.applyCollisionResponse(dataA, dataB, collision);
                    this.collisionCount++;
                }
            }
        }

        // Log collision statistics every 3 seconds
        const currentTime = Date.now();
        if (currentTime - this.lastCollisionLogTime > 3000)
        {
            if (this.collisionCount > 0)
            {
                console.log(`PhysicsSystem: ${this.collisionCount} total collisions in last 3 seconds`);
                console.log(`  Box-Box: ${this.boxBoxCollisions}, Sphere-Sphere: ${this.sphereSphereCollisions}, Box-Sphere: ${this.boxSphereCollisions}`);
            }
            this.collisionCount = 0;
            this.boxBoxCollisions = 0;
            this.sphereSphereCollisions = 0;
            this.boxSphereCollisions = 0;
            this.lastCollisionLogTime = currentTime;
        }

        // Step 6: Check ground collisions and update EntityAPI/GameObject positions
        for (const [entityId, data] of this.entities)
        {
            // Ground collision detection
            if (data.position[2] <= this.GROUND_LEVEL)
            {
                // Collision response: reflect velocity with energy loss
                data.position[2] = this.GROUND_LEVEL;  // Clamp to ground
                data.velocity[2] = -data.velocity[2] * data.bounciness;  // Bounce with energy loss

                // Check if bounce velocity is too low (stop bouncing)
                if (Math.abs(data.velocity[2]) < this.MIN_BOUNCE_VELOCITY)
                {
                    data.velocity[2] = 0;
                    data.isGrounded = true;
                    data.isBouncing = false;
                }
            }
            else
            {
                // Entity is in the air
                data.isGrounded = false;
            }

            // Update entity position via EntityAPI
            await this.entityAPI.updatePosition(data.entityId, data.position);

            // Sync GameObject position if reference is available
            if (data.gameObject)
            {
                data.gameObject.position.x = data.position[0];
                data.gameObject.position.y = data.position[1];
                data.gameObject.position.z = data.position[2];
            }
        }
    }


    /**
     * Get physics status for an entity
     * @param {number} entityId - Entity ID to query
     * @returns {Object|null} Physics data or null if not found
     */
    getEntityStatus(entityId)
    {
        return this.entities.get(entityId) || null;
    }

    /**
     * Get system status (for debugging)
     * @returns {Object} System status information
     */
    getSystemStatus()
    {
        return {
            version: PhysicsSystem.version,
            entityCount: this.entities.size,
            spatialGridCells: this.spatialGrid.size,
            restitution: this.RESTITUTION,
            friction: this.FRICTION,
            entities: Array.from(this.entities.entries()).map(([id, data]) => ({
                entityId: id,
                position: data.position,
                velocity: data.velocity,
                collisionShape: data.collisionShape,
                isGrounded: data.isGrounded,
                isBouncing: data.isBouncing
            }))
        };
    }

    /**
     * Reset entity physics (restart bounce from initial position)
     * @param {number} entityId - Entity ID to reset
     * @param {Array<number>} position - New initial position [x, y, z]
     */
    resetEntity(entityId, position = [0, 0, 5])
    {
        const data = this.entities.get(entityId);
        if (!data)
        {
            console.log(`PhysicsSystem: Entity ${entityId} not found in physics system`);
            return;
        }

        data.position = position;
        data.velocity = [0, 0, 0];
        data.isGrounded = false;
        data.isBouncing = true;

        console.log(`PhysicsSystem: Reset entity ${entityId} to position [${position}]`);
    }
}

console.log('PhysicsSystem: Module loaded (Version 8 - Renamed from BouncePhysics, increased separation bias)');
