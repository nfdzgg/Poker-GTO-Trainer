// Poker GTO Trainer — WebAssembly bindings for postflop-solver.
// Copyright (C) 2026 Poker GTO Trainer contributors.
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by the
// Free Software Foundation, either version 3 of the License, or (at your
// option) any later version.
//
// Based on the wasm-bindgen wrapper in b-inary/wasm-postflop (AGPL-3.0), which
// was used as a reference. The solver itself is b-inary/postflop-solver.

use postflop_solver::*;
use wasm_bindgen::prelude::*;

/// The commit of postflop-solver this crate is built from (see Cargo.toml).
pub const UPSTREAM_COMMIT: &str = "9d1509fe5077d019825f833eed04b16d342dfda1";

#[wasm_bindgen]
pub fn upstream_commit() -> String {
    UPSTREAM_COMMIT.to_string()
}

#[wasm_bindgen]
pub struct Solver {
    game: PostFlopGame,
    iteration: u32,
}

fn action_to_string(a: &Action) -> String {
    match *a {
        Action::Fold => "F".to_string(),
        Action::Check => "X".to_string(),
        Action::Call => "C".to_string(),
        Action::Bet(n) => format!("B{n}"),
        Action::Raise(n) => format!("R{n}"),
        Action::AllIn(n) => format!("A{n}"),
        _ => "?".to_string(),
    }
}

#[wasm_bindgen]
impl Solver {
    #[wasm_bindgen(constructor)]
    #[allow(clippy::new_without_default)]
    pub fn new() -> Solver {
        Solver { game: PostFlopGame::new(), iteration: 0 }
    }

    /// Configure a game. Ranges are 1326-length weight arrays (postflop-solver
    /// card-pair order). Bet strings use postflop-solver syntax, e.g. "33%, a".
    /// Returns an error message, or undefined on success.
    #[allow(clippy::too_many_arguments)]
    pub fn configure(
        &mut self,
        oop_range: &[f32],
        ip_range: &[f32],
        board: &[u8],
        starting_pot: i32,
        effective_stack: i32,
        oop_flop_bet: &str,
        oop_flop_raise: &str,
        ip_flop_bet: &str,
        ip_flop_raise: &str,
        oop_turn_bet: &str,
        oop_turn_raise: &str,
        ip_turn_bet: &str,
        ip_turn_raise: &str,
        oop_river_bet: &str,
        oop_river_raise: &str,
        ip_river_bet: &str,
        ip_river_raise: &str,
        add_allin_threshold: f64,
        force_allin_threshold: f64,
        merging_threshold: f64,
    ) -> Option<String> {
        self.iteration = 0;
        let (turn, river, state) = match board.len() {
            3 => (NOT_DEALT, NOT_DEALT, BoardState::Flop),
            4 => (board[3], NOT_DEALT, BoardState::Turn),
            5 => (board[3], board[4], BoardState::River),
            _ => return Some("The board must have 3, 4 or 5 cards".to_string()),
        };
        let oop = match Range::from_raw_data(oop_range) {
            Ok(r) => r,
            Err(e) => return Some(format!("OOP range: {e}")),
        };
        let ip = match Range::from_raw_data(ip_range) {
            Ok(r) => r,
            Err(e) => return Some(format!("IP range: {e}")),
        };
        let sizes = |b: &str, r: &str, who: &str| -> Result<BetSizeOptions, String> {
            BetSizeOptions::try_from((b, r)).map_err(|e| format!("{who} bet sizes: {e}"))
        };
        let card_config = CardConfig {
            range: [oop, ip],
            flop: [board[0], board[1], board[2]],
            turn,
            river,
        };
        let flop = match (sizes(oop_flop_bet, oop_flop_raise, "OOP flop"), sizes(ip_flop_bet, ip_flop_raise, "IP flop")) {
            (Ok(a), Ok(b)) => [a, b],
            (Err(e), _) | (_, Err(e)) => return Some(e),
        };
        let turn_s = match (sizes(oop_turn_bet, oop_turn_raise, "OOP turn"), sizes(ip_turn_bet, ip_turn_raise, "IP turn")) {
            (Ok(a), Ok(b)) => [a, b],
            (Err(e), _) | (_, Err(e)) => return Some(e),
        };
        let river_s = match (sizes(oop_river_bet, oop_river_raise, "OOP river"), sizes(ip_river_bet, ip_river_raise, "IP river")) {
            (Ok(a), Ok(b)) => [a, b],
            (Err(e), _) | (_, Err(e)) => return Some(e),
        };
        let tree_config = TreeConfig {
            initial_state: state,
            starting_pot,
            effective_stack,
            rake_rate: 0.0,
            rake_cap: 0.0,
            flop_bet_sizes: flop,
            turn_bet_sizes: turn_s,
            river_bet_sizes: river_s,
            turn_donk_sizes: None,
            river_donk_sizes: None,
            add_allin_threshold,
            force_allin_threshold,
            merging_threshold,
        };
        let action_tree = match ActionTree::new(tree_config) {
            Ok(t) => t,
            Err(e) => return Some(e),
        };
        self.game.update_config(card_config, action_tree).err()
    }

    /// Estimated memory in bytes: [uncompressed, compressed].
    pub fn memory_usage(&self) -> Box<[f64]> {
        let (a, b) = self.game.memory_usage();
        vec![a as f64, b as f64].into_boxed_slice()
    }

    pub fn allocate(&mut self, enable_compression: bool) {
        self.game.allocate_memory(enable_compression);
        self.iteration = 0;
    }

    /// Run one Discounted-CFR iteration.
    pub fn solve_step(&mut self) {
        solve_step(&self.game, self.iteration);
        self.iteration += 1;
    }

    pub fn iteration(&self) -> u32 {
        self.iteration
    }

    /// Exploitability in chips (same unit as the pot).
    pub fn exploitability(&self) -> f32 {
        compute_exploitability(&self.game)
    }

    /// Normalize the strategy and compute EVs. Required before reading EVs.
    pub fn finalize(&mut self) {
        finalize(&mut self.game);
    }

    pub fn back_to_root(&mut self) {
        self.game.back_to_root();
    }

    pub fn apply_history(&mut self, history: &[u32]) {
        let h: Vec<usize> = history.iter().map(|&x| x as usize).collect();
        self.game.apply_history(&h);
    }

    pub fn history(&self) -> Box<[u32]> {
        self.game.history().iter().map(|&x| x as u32).collect()
    }

    /// "oop", "ip", "chance" or "terminal".
    pub fn node_type(&self) -> String {
        if self.game.is_terminal_node() {
            "terminal".into()
        } else if self.game.is_chance_node() {
            "chance".into()
        } else if self.game.current_player() == 0 {
            "oop".into()
        } else {
            "ip".into()
        }
    }

    /// Actions at the current node, '/'-separated: F, X, C, B<amt>, R<amt>, A<amt>.
    pub fn actions(&self) -> String {
        if self.game.is_terminal_node() || self.game.is_chance_node() {
            return String::new();
        }
        self.game.available_actions().iter().map(action_to_string).collect::<Vec<_>>().join("/")
    }

    pub fn play(&mut self, action: u32) {
        self.game.play(action as usize);
    }

    /// Cards that can be dealt at the current chance node.
    pub fn possible_cards(&self) -> Box<[u8]> {
        let mask = self.game.possible_cards();
        (0..52u8).filter(|&c| mask & (1u64 << c) != 0).collect()
    }

    pub fn current_board(&self) -> Box<[u8]> {
        self.game.current_board().into_boxed_slice()
    }

    /// Private hands of a player as (c1 | c2 << 8).
    pub fn private_cards(&self, player: usize) -> Box<[u16]> {
        self.game.private_cards(player).iter().map(|&(a, b)| a as u16 | ((b as u16) << 8)).collect()
    }

    /// [oop, ip] total chips committed so far in the hand beyond the starting pot.
    pub fn total_bet_amount(&self) -> Box<[i32]> {
        let t = self.game.total_bet_amount();
        vec![t[0], t[1]].into_boxed_slice()
    }

    pub fn starting_pot(&self) -> i32 {
        self.game.tree_config().starting_pot
    }

    pub fn effective_stack(&self) -> i32 {
        self.game.tree_config().effective_stack
    }

    /// Strategy of the current player: #actions × #hands (action-major).
    pub fn strategy(&self) -> Box<[f32]> {
        self.game.strategy().into_boxed_slice()
    }

    pub fn cache_normalized_weights(&mut self) {
        self.game.cache_normalized_weights();
    }

    /// Range weights of a player at the current node (reach probabilities × initial weights).
    pub fn weights(&self, player: usize) -> Box<[f32]> {
        self.game.weights(player).to_vec().into_boxed_slice()
    }

    /// Weights normalized for card removal (call cache_normalized_weights first).
    pub fn normalized_weights(&self, player: usize) -> Box<[f32]> {
        self.game.normalized_weights(player).to_vec().into_boxed_slice()
    }

    /// Equity of each hand (call cache_normalized_weights first).
    pub fn equity(&self, player: usize) -> Box<[f32]> {
        self.game.equity(player).into_boxed_slice()
    }

    /// EV of each hand in chips (requires finalize + cache_normalized_weights).
    pub fn expected_values(&self, player: usize) -> Box<[f32]> {
        self.game.expected_values(player).into_boxed_slice()
    }

    /// EV of each action for each hand of the current player: #actions × #hands.
    pub fn expected_values_detail(&self, player: usize) -> Box<[f32]> {
        self.game.expected_values_detail(player).into_boxed_slice()
    }
}
