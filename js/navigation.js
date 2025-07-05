// --- Configuration ---
const GRID_SIZE = 5; // The town will be a GRID_SIZE x GRID_SIZE square grid of buildings
// The player moves on a (GRID_SIZE+1) x (GRID_SIZE+1) grid of intersections/roads.
const BUILDING_TYPES = [
    "Post Office", "Hospital", "Municipality", "Shop", "Restaurant",
    "Park", "Library", "Cafe", "Bank", "School", "Museum", "Apartments"
];
const GENERIC_TARGET_BUILDING_TYPE = "Restaurant"; // The type of building we are looking for

// Mapping for displaying the town map: single character to full generic building name
const BUILDING_CODE_MAP = {
    'P': "Post Office",
    'H': "Hospital",
    'M': "Municipality",
    'S': "Shop",
    'R': "Restaurant",
    'K': "Park",
    'L': "Library",
    'C': "Cafe",
    'B': "Bank",
    'O': "School", // 'S' is already used for Shop
    'U': "Museum", // 'M' is already used for Municipality
    'A': "Apartments",
    'X': "Empty Lot" // For empty spaces if desired
};
// Reverse map for display/validation (to get code from generic building name)
const CODE_TO_BUILDING = Object.fromEntries(
    Object.entries(BUILDING_CODE_MAP).map(([key, value]) => [value, key])
);

const UNIQUE_NAMES_POOL = {
    "Post Office": ["New Post", "City Mail", "Express Post", "Old Town Post"],
    "Hospital": ["General Hospital", "City Clinic", "Mercy Hospital", "St. Jude's Medical"],
    "Municipality": ["City Hall", "Town Council", "Civic Center", "Grand Municipality"],
    "Shop": ["Corner Mart", "Grand Bazaar", "Fashion Boutique", "Tech Emporium", "Book Nook", "Green Grocer"],
    "Restaurant": ["Luke's Diner", "The Golden Spoon", "Pizza Palace", "Sushi Spot", "Burger Joint", "The Hungry Bear"],
    "Park": ["New Park", "River Park", "Green Oasis", "Rose Garden"],
    "Library": ["Main Library", "Quiet Reads", "Community Library", "Knowledge Hub"],
    "Cafe": ["The Daily Grind", "Coffee Corner", "Sweet Treats Cafe", "Brew House"],
    "Bank": ["First National Bank", "Secure Vault Bank", "City Bank", "Trust Union"],
    "School": ["Northwood School", "Science Academy", "Maple Street School", "Bright Minds School"],
    "Museum": ["History Museum", "Art Gallery", "Science Center", "Natural History Museum"],
    "Apartments": ["City View Apartments", "Sunset Towers", "Green Valley Homes", "Riverwalk Residences"],
    "Empty Lot":["Empty Lot"]
};

// --- Global Game State ---
let town_grid = []; // Stores the buildings with unique names, GRID_SIZE x GRID_SIZE
let player_pos = [0, 0];  // [row_intersection, col_intersection]
let player_trace = []; // Stores the player's path as a list of intersections visited
let player_direction_index = 0; // Index into DIRECTIONS list
let actual_target_building_name = ""; // Stores the unique name of the specific target building (e.g., "Restaurant 3")

// Directions and their corresponding (row_change, col_change) vectors for intersections
// Moving North decreases row_intersection, East increases col_intersection, etc.
const DIRECTIONS = ["North", "East", "South", "West"];
const DIRECTION_VECTORS = {
    "North": [-1, 0],
    "East": [0, 1],
    "South": [1, 0],
    "West": [0, -1]
};

// --- Town Generation ---
function generate_town() {
    town_grid = [];
    // Keep track of used unique names for each building type to ensure no duplicates in one town
    const used_unique_names = {};
    for (const bt of BUILDING_TYPES) {
        used_unique_names[bt] = [];
    }
    const all_target_buildings_unique_names = []; // To store unique names of all generated target buildings

    for (let r = 0; r < GRID_SIZE; r++) {
        const row = [];
        for (let c = 0; c < GRID_SIZE; c++) {
            const building_type = BUILDING_TYPES[Math.floor(Math.random() * BUILDING_TYPES.length)];
            
            // Get available names for this building type
            const available_names = (UNIQUE_NAMES_POOL[building_type] || []).filter(name => !used_unique_names[building_type].includes(name));

            let unique_name = "";
            if (available_names.length > 0) {
                unique_name = available_names[Math.floor(Math.random() * available_names.length)];
                used_unique_names[building_type].push(unique_name);
            } else {
                // Fallback if all unique names for a type are exhausted or type not in pool
                unique_name = "Empty Lot"; // Or generate a generic one like "Building X"
            }

            row.push(unique_name);
            if (building_type === GENERIC_TARGET_BUILDING_TYPE) {
                all_target_buildings_unique_names.push(unique_name);
            }
        }
        town_grid.push(row);
    }

    // Ensure at least one target building exists and pick one as the actual target
    if (all_target_buildings_unique_names.length === 0) {
        // If no target buildings were randomly placed, force one into a random spot
        const r = Math.floor(Math.random() * GRID_SIZE);
        const c = Math.floor(Math.random() * GRID_SIZE);
        
        // Force a target building with a unique name
        const available_target_names = (UNIQUE_NAMES_POOL[GENERIC_TARGET_BUILDING_TYPE] || []).filter(name => !used_unique_names[GENERIC_TARGET_BUILDING_TYPE].includes(name));
        let forced_target_name;
        if (available_target_names.length > 0) {
            forced_target_name = available_target_names[Math.floor(Math.random() * available_target_names.length)];
        } else {
            // Fallback if even the target building's unique names are exhausted
            const count = used_unique_names[GENERIC_TARGET_BUILDING_TYPE].length + 1;
            forced_target_name = `${GENERIC_TARGET_BUILDING_TYPE} ${count}`;
        }

        town_grid[r][c] = forced_target_name;
        actual_target_building_name = forced_target_name;
        // appendMessage(`Forced a ${GENERIC_TARGET_BUILDING_TYPE} at (${r},${c}) and set it as target: ${actual_target_building_name}`);
    } else {
        actual_target_building_name = all_target_buildings_unique_names[Math.floor(Math.random() * all_target_buildings_unique_names.length)];
        // appendMessage(`Chosen target ${GENERIC_TARGET_BUILDING_TYPE}: ${actual_target_building_name}`);
    }

    // appendMessage(`Town generated! It's a ${GRID_SIZE}x${GRID_SIZE} grid of uniquely named buildings.`);
    return true;
}

function print_town_map() {
    let mapString = "--- Town Map Layout ---\n";
    mapString += "Legend (each character represents a unique instance of that building type):\n";
    for (const code in BUILDING_CODE_MAP) {
        mapString += `  '${code}': ${BUILDING_CODE_MAP[code]}\n`;
    }
    mapString += "-".repeat(GRID_SIZE * 4 + 3) + "\n"; // Adjust separator length

    // Print column headers
    let header = "  " + Array.from({ length: GRID_SIZE + 1 }, (_, i) => String(i).padStart(3, ' ')).join(" ");
    mapString += header + "\n";
    mapString += "0  +" + "---+".repeat(GRID_SIZE) + "\n";

    for (let r = 0; r < GRID_SIZE; r++) {
        let row_str = "   |";
        for (let c = 0; c < GRID_SIZE; c++) {
            const unique_building_name = town_grid[r][c];
            // Extract generic building type from unique name (e.g., "Restaurant 1" -> "Restaurant")
            let generic_building_type = "Unknown";
            for (const b_type in UNIQUE_NAMES_POOL) {
                if (UNIQUE_NAMES_POOL[b_type].includes(unique_building_name)) {
                    generic_building_type = b_type;
                    break;
                }
            }
            const code = CODE_TO_BUILDING[generic_building_type] || '?'; // Get code, default to '?' if not found
            row_str += ` ${code} |`;
        }
        mapString += row_str + "\n";
        mapString += `${String(r + 1).padEnd(2, ' ')} +` + "---+".repeat(GRID_SIZE) + "\n";
    }
    mapOutputDiv.textContent = mapString;
}

// --- Player Initialization ---
function initialize_player() {
    // find the row and the column of the target building
    let actual_target_building_r = 0;
    let actual_target_building_c = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (town_grid[r][c] === actual_target_building_name) {
                actual_target_building_r = r;
                actual_target_building_c = c;
                break;
            }
        }
    }

    while (true) {
        player_pos = [Math.floor(Math.random() * (GRID_SIZE + 1)), Math.floor(Math.random() * (GRID_SIZE + 1))];
        dis_r = Math.abs(player_pos[0] - actual_target_building_r);
        dis_c = Math.abs(player_pos[1] - actual_target_building_c);
        if (dis_r + dis_c > 2) break; // Ensure the player starts at least 2 blocks away from the target building
    }
    player_trace.push(player_pos);
    player_direction_index = Math.floor(Math.random() * DIRECTIONS.length);
    // appendMessage(`Player initialized at intersection (${player_pos[0]}, ${player_pos[1]}) facing ${DIRECTIONS[player_direction_index]}.`);
}

// --- Game Display ---
function display_status() {
    const [current_row_int, current_col_int] = player_pos;
    const current_direction = DIRECTIONS[player_direction_index];

    let statusString = ""; //"\n" + "=".repeat(40) + "\n";
    statusString += `Now, you are facing <b>${current_direction}</b>.\n`;
    statusString += "In front of you, you can see:\n";

    // Define the 4 quadrants of buildings relative to an intersection (dr, dc)
    // (dr, dc) refers to the offset from the intersection to the building's top-left corner
    // These are fixed relative to the grid, not player direction.
    // Order for display: Front-Left, Front-Right, Back-Left, Back-Right
    const ordered_building_quadrant_offsets = [
        [0, -1],   // Corresponds to Front-Left/Right depending on player direction
        [0, 0],    // Corresponds to Front-Left/Right depending on player direction
        [-1, -1],  // Corresponds to Back-Left/Right depending on player direction
        [-1, 0]    // Corresponds to Back-Left/Right depending on player direction
    ];

    // Map Quadrant offsets to player-relative terms based on player's direction
    const relative_position_map = {
        0: { // Player facing North
            "-1,-1": "Front-Left",
            "-1,0": "Front-Right",
            "0,-1": "Back-Left",
            "0,0": "Back-Right"
        },
        1: { // Player facing East
            "-1,0": "Front-Left",
            "0,0": "Front-Right",
            "-1,-1": "Back-Left",
            "0,-1": "Back-Right"
        },
        2: { // Player facing South
            "0,0": "Front-Left",
            "0,-1": "Front-Right",
            "-1,0": "Back-Left",
            "-1,-1": "Back-Right"
        },
        3: { // Player facing West
            "0,-1": "Front-Left",
            "-1,-1": "Front-Right",
            "0,0": "Back-Left",
            "-1,0": "Back-Right"
        }
    };

    let found_buildings = false;
    const print_list = {};
    for (const [dr, dc] of ordered_building_quadrant_offsets) {
        const building_row = current_row_int + dr;
        const building_col = current_col_int + dc;
        // Check if the building coordinates are within the town_grid bounds
        if (building_row >= 0 && building_row < GRID_SIZE && building_col >= 0 && building_col < GRID_SIZE) {
            const building_name = town_grid[building_row][building_col];
            // Get the relative description based on player's current direction
            const relative_desc = relative_position_map[player_direction_index][`${dr},${dc}`] || "Unknown Position";
            print_list[relative_desc] = building_name;
            found_buildings = true;
        }
    }
    if (found_buildings) {
        for (const relative_desc of ["Front-Left","Front-Right"]) { //,"Back-Left","Back-Right"]) {
            if (print_list[relative_desc]) {
                statusString += `  - <b>${print_list[relative_desc]}</b> on your <b>` + relative_desc.split('-')[1] + '</b>.\n';
            } else {
                statusString += `  - The edge of the town on your <b>` + relative_desc.split('-')[1] + '</b>.\n';
            }
        }
    } else {
        statusString += "  (No buildings immediately visible from this edge of town)\n";
    }
    // statusString += "=".repeat(40) + "\n";
    // if ( CHATBOT_MODE ) {
    appendMessage(statusString);
    // } else {
    //     statusString += "\n";
    //     gameOutputDiv.innerHTML += `<p>${statusString.replace(/\n/g, '<br>')}</p>`; // Use innerHTML to preserve line breaks
    //     gameOutputDiv.scrollTop = gameOutputDiv.scrollHeight;
    // }
}

// --- Player Actions ---
function move_player(command) {
    let [current_row_int, current_col_int] = player_pos;
    const current_direction_name = DIRECTIONS[player_direction_index];

    if (command === 'f') { // Move Forward
        const [dr, dc] = DIRECTION_VECTORS[current_direction_name];
        const new_row_int = current_row_int + dr;
        const new_col_int = current_col_int + dc;
        if (new_row_int >= 0 && new_row_int <= GRID_SIZE && new_col_int >= 0 && new_col_int <= GRID_SIZE) {
            player_pos = [new_row_int, new_col_int];
            player_trace.push(player_pos);
            appendMessage('You <b>moved forward</b> one block.'); //to intersection (${new_row_int}, ${new_col_int}).`);
        } else {
            appendMessage("You hit the edge of the town! Cannot move further in that direction.", "red-text");
        }
    } else if (command === 'l') { // Turn Left
        player_direction_index = (player_direction_index - 1 + DIRECTIONS.length) % DIRECTIONS.length;
        appendMessage(`You turned <b>left</b>.`); // Now facing ${DIRECTIONS[player_direction_index]}.`);
    } else if (command === 'r') { // Turn Right
        player_direction_index = (player_direction_index + 1) % DIRECTIONS.length;
        appendMessage(`You turned <b>right</b>.`); // Now facing ${DIRECTIONS[player_direction_index]}.`);
    } else {
        appendMessage("Invalid command. Please use 'f', 'l', or 'r'.", "red-text");
    }
}

// --- Game Win Condition ---
function is_near_target() {
    const [current_row_int, current_col_int] = player_pos;

    // Check the four potential building cells surrounding the intersection
    const building_offsets_from_intersection = [
        [-1, -1],  // North-West building
        [-1, 0],   // North-East building
        [0, -1],   // South-West building
        [0, 0]     // South-East building
    ];

    for (const [dr, dc] of building_offsets_from_intersection) {
        const building_row = current_row_int + dr;
        const building_col = current_col_int + dc;
        if (building_row >= 0 && building_row < GRID_SIZE && building_col >= 0 && building_col < GRID_SIZE) {
            if (town_grid[building_row][building_col] === actual_target_building_name) {
                return true;
            }
        }
    }
    return false;
}

// --- Navigation Algorithm Function ---
function is_building_near_intersection(building_name_to_find, intersection_row, intersection_col) {
    const building_offsets_from_intersection = [
        [-1, -1],  // North-West building
        [-1, 0],   // North-East building
        [0, -1],   // South-West building
        [0, 0]     // South-East building
    ];

    for (const [dr, dc] of building_offsets_from_intersection) {
        const building_row = intersection_row + dr;
        const building_col = intersection_col + dc;
        if (building_row >= 0 && building_row < GRID_SIZE && building_col >= 0 && building_col < GRID_SIZE) {
            if (town_grid[building_row][building_col] === building_name_to_find) {
                return true;
            }
        }
    }
    return false;
}

function get_visible_buildings_description(intersection_row, intersection_col, current_direction_index) {
    const visible_descriptions = [];
    
    // Order for display: Front-Left, Front-Right, Back-Left, Back-Right
    const ordered_building_quadrant_offsets = [
        [0, -1],
        [0, 0],
        [-1, -1],
        [-1, 0]
    ];

    // Map Quadrant offsets to player-relative terms based on player's direction
    const relative_position_map = {
        0: { // Player facing North
            "-1,-1": "Front-Left",
            "-1,0": "Front-Right",
            "0,-1": "Back-Left",
            "0,0": "Back-Right"
        },
        1: { // Player facing East
            "-1,0": "Front-Left",
            "0,0": "Front-Right",
            "-1,-1": "Back-Left",
            "0,-1": "Back-Right"
        },
        2: { // Player facing South
            "0,0": "Front-Left",
            "0,-1": "Front-Right",
            "-1,0": "Back-Left",
            "-1,-1": "Back-Right"
        },
        3: { // Player facing West
            "0,-1": "Front-Left",
            "-1,-1": "Front-Right",
            "0,0": "Back-Left",
            "-1,0": "Back-Right"
        }
    };
    description_left = null;
    description_right = null;
    for (const [dr, dc] of ordered_building_quadrant_offsets) {
        const building_row = intersection_row + dr;
        const building_col = intersection_col + dc;
        if (building_row >= 0 && building_row < GRID_SIZE && building_col >= 0 && building_col < GRID_SIZE) {
            const building_name = town_grid[building_row][building_col];
            const relative_desc = relative_position_map[current_direction_index][`${dr},${dc}`] || "Unknown Position";
            if (relative_desc == "Front-Left")  description_left = `the <b>${building_name}</b> on your <b>left</b>`;
            if (relative_desc == "Front-Right") description_right = `the <b>${building_name}</b> on your <b>right</b>`;
        }
    }
    if (description_left != null )  visible_descriptions.push(description_left);
    if (description_right != null ) visible_descriptions.push(description_right);
    return visible_descriptions;
}


function find_path_and_describe(destination_building_name) {
    const [start_row, start_col] = player_pos;
    const start_direction_idx = player_direction_index;

    // Queue for BFS: [row, col, direction_idx, path_of_actions]
    // path_of_actions: list of [action_command, new_row, new_col, new_direction_idx]
    const queue = [[start_row, start_col, start_direction_idx, []]];
    
    // Visited set: (row, col, direction_idx)
    const visited = new Set();
    visited.add(`${start_row},${start_col},${start_direction_idx}`);

    let target_path = null;

    while (queue.length > 0) {
        const [r, c, d_idx, path] = queue.shift();

        // Check if we are near the target building from this intersection
        if (is_building_near_intersection(destination_building_name, r, c)) {
            target_path = path;
            break;
        }

        // Explore possible moves: forward, left, right
        // [action_command, dr_move, dc_move, d_idx_change]
        const possible_moves = [];
        
        // Forward
        const [dr_f, dc_f] = DIRECTION_VECTORS[DIRECTIONS[d_idx]];
        possible_moves.push(['f', dr_f, dc_f, 0]);
        
        // Turn Left
        possible_moves.push(['l', 0, 0, -1]);
        
        // Turn Right
        possible_moves.push(['r', 0, 0, 1]);

        for (const [action_cmd, dr_move, dc_move, d_idx_change] of possible_moves) {
            let next_r = r + dr_move;
            let next_c = c + dc_move;
            const next_d_idx = (d_idx + d_idx_change + DIRECTIONS.length) % DIRECTIONS.length;

            // Validate next position (only for 'f' commands, turns don't change position)
            if (action_cmd === 'f' && !(next_r >= 0 && next_r <= GRID_SIZE && next_c >= 0 && next_c <= GRID_SIZE)) {
                continue; // Cannot move off grid
            }

            // If it's a turn, the position doesn't change, only direction
            if (action_cmd === 'l' || action_cmd === 'r') {
                next_r = r;
                next_c = c;
            }

            const state_key = `${next_r},${next_c},${next_d_idx}`;
            if (!visited.has(state_key)) {
                visited.add(state_key);
                // Store the action command and the resulting state (position and direction)
                const new_path = [...path, [action_cmd, next_r, next_c, next_d_idx]];
                queue.push([next_r, next_c, next_d_idx, new_path]);
            }
        }
    }
    
    if (!target_path) {
        return ["I cannot find a clear path to that destination from your current location."];
    }

    // --- Generate Instructions from Path ---
    const instructions = [];
    
    // Initial description of surroundings
    const initial_visible = get_visible_buildings_description(start_row, start_col, start_direction_idx);
    if (initial_visible.length > 0) {
        instructions.push(`You are facing <b>${DIRECTIONS[start_direction_idx]}</b>. In front of your current position, you can see ${initial_visible.join(', ')}.`);
    } else {
        // instructions.push("From your current position, no buildings are immediately visible.");
        instructions.push(`You are facing <b>${DIRECTIONS[start_direction_idx]}</b>. In front of your current position, no buildings are in front of you.`);
    }

    // Group consecutive 'f' moves
    const grouped_path = [];
    if (target_path) {
        let i = 0;
        while (i < target_path.length) {
            const [action_cmd, next_r, next_c, next_d_idx] = target_path[i];
            if (action_cmd === 'f') {
                let count = 0;
                let j = i;
                let temp_r = (j > 0) ? target_path[j-1][1] : start_row;
                let temp_c = (j > 0) ? target_path[j-1][2] : start_col;
                let temp_d_idx = (j > 0) ? target_path[j-1][3] : start_direction_idx;
                
                while (j < target_path.length) {
                    const [next_action_cmd, next_pos_r, next_pos_c, next_dir_idx] = target_path[j];
                    if (next_action_cmd === action_cmd && next_dir_idx === temp_d_idx) {
                        const [dr_check, dc_check] = DIRECTION_VECTORS[DIRECTIONS[temp_d_idx]];
                        if ((temp_r + dr_check) === next_pos_r && (temp_c + dc_check) === next_pos_c) {
                            count += 1;
                            temp_r = next_pos_r;
                            temp_c = next_pos_c;
                            j++;
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                }
                
                if (count > 0) {
                    grouped_path.push([action_cmd, count, temp_r, temp_c, temp_d_idx]);
                    i = j;
                } else {
                    grouped_path.push([action_cmd, 1, next_r, next_c, next_d_idx]);
                    i++;
                }
            } else { // For turns, always a single step
                grouped_path.push([action_cmd, 1, next_r, next_c, next_d_idx]);
                i++;
            }
        }
    }
    
    
    let pre_action_info = null;

    for (const action_info of grouped_path) {
        const action_cmd = action_info[0];
        const steps = action_info[1];
        
        if (action_cmd === 'f') {
            if (steps > 1) {
                // instructions.push(`Go straight for ${steps} blocks.`);
                instructions.push(`<b>Go straight</b> several blocks.`);
            } else {
                instructions.push(`<b>Go straight</b> one block.`);
            }
        } else if (action_cmd === 'l') {
            if ( pre_action_info != null && pre_action_info[0] == 'f') {
                const [current_r, current_c, current_d_idx] = [pre_action_info[2], pre_action_info[3], pre_action_info[4]];
                const visible_before_turn = get_visible_buildings_description(current_r, current_c, current_d_idx);
                if (visible_before_turn.length > 0) {
                    instructions.push(`You will see ${visible_before_turn.join(', ')}.`);
                }
            }
            instructions.push("<b>Turn left.</b>");
            const [current_r, current_c, current_d_idx] = [action_info[2], action_info[3], action_info[4]];
            const visible_after_turn = get_visible_buildings_description(current_r, current_c, current_d_idx);
            if (visible_after_turn.length > 0) {
                instructions.push(`You will face <b>${DIRECTIONS[current_d_idx]}</b>, and you will see ${visible_after_turn.join(', ')}.`);
            }
        } else if (action_cmd === 'r') {
            if ( pre_action_info != null && pre_action_info[0] == 'f') {
                const [current_r, current_c, current_d_idx] = [pre_action_info[2], pre_action_info[3], pre_action_info[4]];
                const visible_before_turn = get_visible_buildings_description(current_r, current_c, current_d_idx);
                if (visible_before_turn.length > 0) {
                    instructions.push(`You will see ${visible_before_turn.join(', ')}.`);
                }
            }
            instructions.push("<b>Turn right.</b>");
            const [current_r, current_c, current_d_idx] = [action_info[2], action_info[3], action_info[4]];
            const visible_after_turn = get_visible_buildings_description(current_r, current_c, current_d_idx);
            if (visible_after_turn.length > 0) {
                instructions.push(`You will face <b>${DIRECTIONS[current_d_idx]}</b>, and you will see ${visible_after_turn.join(', ')}.`);
            }
        }
        pre_action_info = action_info;
    }
    
    instructions.push(`You will arrive near <b>${destination_building_name}</b>.`);

    var final_instructions = "Here is how to go to the " + destination_building_name + ". <b>Make sure to read and remember this carefully</b>:\n";
    for (let i = 0; i < instructions.length; i++) {
        final_instructions += "\n" + instructions[i] + "\n";
    }
    
    return final_instructions;
}


// --- Main Game Loop ---
function main_game_loop() {
    gameOutputDiv.innerHTML = ''; // Clear previous game output
    // mapOutputDiv.textContent = ''; // Clear previous map output

    generate_town();
    // print_town_map();
    
    initialize_player();

    // appendMessage("\n--- Welcome to Town Navigator! ---");
    appendMessage(`Your mission: Find the <b>${actual_target_building_name}</b>.`);
    appendMessage(find_path_and_describe(actual_target_building_name),"green-text");
    appendMessage("Commands: 'f' (forward), 'l' (turn left), 'r' (turn right)");

    display_status(); // Initial status display

    // Event listener for button click
    submitButton.onclick = () => handleCommand();
    // Event listener for Enter key in the input field
    commandInput.onkeydown = (event) => {
        if (event.key === 'Enter') {
            handleCommand();
        }
    };
}

function handleCommand() {
    const command = commandInput.value.toLowerCase().trim();
    commandInput.value = ''; // Clear input field

    if (['f', 'l', 'r'].includes(command)) {
        move_player(command);
    } else {
        appendMessage("Invalid command. Please try again.", "red-text");
    }

    display_status(); // Update status after each valid move

    // Always check win condition after a move
    if (is_near_target()) {
        appendMessage(`\nCongratulations! You found the ${actual_target_building_name} near your current position!`, "green-text");
        // You can add logic here to restart the game or display a "Play Again?" button
        // submitButton.disabled = true;
        // commandInput.disabled = true;
    }
}
