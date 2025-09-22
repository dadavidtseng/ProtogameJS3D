// Basic test functions
function basicTests() {
    console.log("=== Basic JavaScript Tests ===");

    // Math operations
    var result = 10 + 5 * 2;
    console.log("Math operation 10 + 5 * 2 = " + result);

    // String operations
    var greeting = "Hello " + "Protogame3D!";
    console.log("String concatenation: " + greeting);

    // Array operations
    var numbers = [1, 2, 3, 4, 5];
    var sum = 0;
    for (var i = 0; i < numbers.length; i++) {
        sum += numbers[i];
    }
    console.log("Array sum: " + sum);

    // Object operations
    var player = {
        name: "Test Player",
        level: 10,
        health: 100
    };
    console.log("Player info: " + player.name + ", Level: " + player.level);
}

// Game object tests
function gameObjectTests() {
    console.log("=== Game Object Tests ===");

    // Get player position
    var playerPos = game.getPlayerPosition();
    console.log("Current player position: x=" + playerPos.x + ", y=" + playerPos.y + ", z=" + playerPos.z);

    // Create a cube
    game.createCube(0, 0, 5);
    console.log("Created cube at (0, 0, 5)");

    // Move prop
    game.moveProp(0, 3, 3, 1);
    console.log("Moved prop 0 to position (3, 3, 1)");
}

// Complex pattern tests
function patternTests() {
    console.log("=== Complex Pattern Tests ===");

    // Create circle pattern
    function createCirclePattern(radius, count) {
        console.log("Creating circle pattern, radius: " + radius + ", number of objects: " + count);

        for (var i = 0; i < count; i++) {
            var angle = (i / count) * 2 * Math.PI;
            var x = Math.cos(angle) * radius;
            var y = Math.sin(angle) * radius;
            var z = 0;

            game.createCube(x, y, z);
        }
    }

    // Create grid pattern
    function createGridPattern(size, spacing) {
        console.log("Creating grid pattern, size: " + size + "x" + size + ", spacing: " + spacing);

        for (var x = 0; x < size; x++) {
            for (var y = 0; y < size; y++) {
                game.createCube(x * spacing, y * spacing, 0);
            }
        }
    }

    // Create spiral pattern
    function createSpiralPattern(turns, radius) {
        console.log("Creating spiral pattern, turns: " + turns + ", radius: " + radius);

        var steps = turns * 20; // 20 points per turn

        for (var i = 0; i < steps; i++) {
            var t = i / steps;
            var angle = t * turns * 2 * Math.PI;
            var currentRadius = t * radius;

            var x = Math.cos(angle) * currentRadius;
            var y = Math.sin(angle) * currentRadius;
            var z = t * 5; // Increase height along spiral

            game.createCube(x, y, z);
        }
    }

    // Run pattern tests
    createCirclePattern(5, 8);
    createGridPattern(3, 2);
    createSpiralPattern(2, 8);
}

// Animation test functions
function animationTests() {
    console.log("=== Animation Tests ===");

    // Simulate time-based animation
    var time = Date.now() / 1000; // Convert to seconds

    // Swinging cubes animation
    function createSwingingCubes() {
        console.log("Creating swinging cubes animation");

        for (var i = 0; i < 5; i++) {
            var x = i * 2;
            var y = Math.sin(time + i * 0.5) * 3; // Swinging
            var z = 2;

            game.createCube(x, y, z);
        }
    }

    // Wave pattern animation
    function createWavePattern() {
        console.log("Creating wave pattern");

        for (var x = -10; x <= 10; x++) {
            for (var y = -10; y <= 10; y++) {
                var distance = Math.sqrt(x * x + y * y);
                var height = Math.sin(distance - time * 2) * 2 + 3;

                game.createCube(x, y, height);
            }
        }
    }

    createSwingingCubes();
    // createWavePattern(); // Commented out because it creates too many cubes
}

// Math utility functions
function mathUtils() {
    console.log("=== Math Utilities Tests ===");

    // Distance calculation
    function distance3D(x1, y1, z1, x2, y2, z2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        var dz = z2 - z1;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    // Linear interpolation
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    // Test math functions
    var dist = distance3D(0, 0, 0, 3, 4, 0);
    console.log("Distance from (0,0,0) to (3,4,0): " + dist);

    var interpolated = lerp(10, 20, 0.5);
    console.log("50% interpolation between 10 and 20: " + interpolated);

    // Generate random positions
    function generateRandomPositions(count, range) {
        console.log("Generating " + count + " random positions, range: ±" + range);

        for (var i = 0; i < count; i++) {
            var x = (Math.random() - 0.5) * 2 * range;
            var y = (Math.random() - 0.5) * 2 * range;
            var z = Math.random() * range;

            game.createCube(x, y, z);
            console.log("Random cube " + i + ": (" + x.toFixed(2) + ", " + y.toFixed(2) + ", " + z.toFixed(2) + ")");
        }
    }

    generateRandomPositions(5, 10);
}

// Game logic tests
function gameLogicTests() {
    console.log("=== Game Logic Tests ===");

    // Simple game state management
    var gameState = {
        score: 0,
        level: 1,
        enemies: [],
        powerUps: []
    };

    // Increase score
    function addScore(points) {
        gameState.score += points;
        console.log("Score increased by " + points + ", total: " + gameState.score);

        // Check for level up
        if (gameState.score >= gameState.level * 1000) {
            gameState.level++;
            console.log("Leveled up to level " + gameState.level + "!");
        }
    }

    // Spawn enemy
    function spawnEnemy(x, y, z) {
        var enemy = {
            id: gameState.enemies.length,
            x: x,
            y: y,
            z: z,
            health: 100
        };

        gameState.enemies.push(enemy);
        game.createCube(x, y, z);
        console.log("Spawned enemy " + enemy.id + " at position (" + x + ", " + y + ", " + z + ")");

        return enemy;
    }

    // Move all enemies
    function moveEnemies() {
        console.log("Moving all enemies...");

        for (var i = 0; i < gameState.enemies.length; i++) {
            var enemy = gameState.enemies[i];
            enemy.x += (Math.random() - 0.5) * 2;
            enemy.y += (Math.random() - 0.5) * 2;

            game.moveProp(i, enemy.x, enemy.y, enemy.z);
            console.log("Enemy " + enemy.id + " moved to (" + enemy.x.toFixed(2) + ", " + enemy.y.toFixed(2) + ", " + enemy.z + ")");
        }
    }

    // Run game logic tests
    addScore(150);
    addScore(200);
    addScore(300);
    addScore(450);

    spawnEnemy(5, 5, 1);
    spawnEnemy(-3, 7, 1);
    spawnEnemy(8, -2, 1);

    moveEnemies();
}

// Main test function
function runAllTests() {
    console.log("Starting all JavaScript tests...");
    console.log("=====================================");

    basicTests();
    console.log("");

    gameObjectTests();
    console.log("");

    mathUtils();
    console.log("");

    patternTests();
    console.log("");

    animationTests();
    console.log("");

    gameLogicTests();
    console.log("");

    console.log("=====================================");
    console.log("All tests completed!");
}

runAllTests();
