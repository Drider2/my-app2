// Gym Training Programs Service (Section 5 Specification)
import { db, generateUUID } from './storage';
import { TrainingProgram, TrainingDay, TrainingExercise, ProgramTemplateType } from '../types';

export const GymProgramService = {
  /**
   * Retrieves all available training programs
   */
  getAllPrograms(): TrainingProgram[] {
    const state = db.getState();
    return state.trainingPrograms || [];
  },

  /**
   * Returns the currently active training program
   */
  getActiveProgram(): TrainingProgram | null {
    const state = db.getState();
    const programs = state.trainingPrograms || [];
    return programs.find(p => p.id === state.activeProgramId) || programs[0] || null;
  },

  /**
   * Switches the active training program.
   * Completely preserves historical workout records.
   */
  setActiveProgram(programId: string): void {
    db.updateState(draft => {
      draft.activeProgramId = programId;
      for (const p of draft.trainingPrograms) {
        p.is_active = p.id === programId;
      }
    });
  },

  /**
   * Toggles pause/active state on a program
   */
  togglePauseProgram(programId: string): void {
    db.updateState(draft => {
      const prog = draft.trainingPrograms.find(p => p.id === programId);
      if (prog) {
        prog.is_paused = !prog.is_paused;
      }
    });
  },

  /**
   * Duplicates an existing program as a customizable template
   */
  duplicateProgram(programId: string): TrainingProgram | null {
    const state = db.getState();
    const source = state.trainingPrograms.find(p => p.id === programId);
    if (!source) return null;

    const now = Date.now();
    const newProg: TrainingProgram = {
      ...source,
      id: generateUUID(),
      name: `${source.name} (Custom Copy)`,
      template_type: 'custom',
      is_active: false,
      is_paused: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      days: source.days.map(d => ({
        ...d,
        id: generateUUID(),
        exercises: d.exercises.map(e => ({
          ...e,
          id: generateUUID(),
        }))
      }))
    };

    db.updateState(draft => {
      draft.trainingPrograms.push(newProg);
    });

    return newProg;
  },

  /**
   * Creates a custom program from scratch
   */
  createProgram(programData: Omit<TrainingProgram, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): TrainingProgram {
    const now = Date.now();
    const newProg: TrainingProgram = {
      ...programData,
      id: generateUUID(),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    db.updateState(draft => {
      draft.trainingPrograms.push(newProg);
    });

    return newProg;
  },

  /**
   * Updates an existing program's schedule or exercises
   */
  updateProgram(programId: string, updates: Partial<TrainingProgram>): void {
    db.updateState(draft => {
      const prog = draft.trainingPrograms.find(p => p.id === programId);
      if (prog) {
        Object.assign(prog, updates);
        prog.updated_at = Date.now();
      }
    });
  },

  /**
   * Deletes a training program (preserves at least one default)
   */
  deleteProgram(programId: string): boolean {
    let deleted = false;
    db.updateState(draft => {
      if (draft.trainingPrograms.length <= 1) return;
      const index = draft.trainingPrograms.findIndex(p => p.id === programId);
      if (index >= 0) {
        draft.trainingPrograms.splice(index, 1);
        if (draft.activeProgramId === programId) {
          draft.activeProgramId = draft.trainingPrograms[0].id;
          draft.trainingPrograms[0].is_active = true;
        }
        deleted = true;
      }
    });
    return deleted;
  },

  /**
   * Determines the next upcoming workout session based on the active program and recent history
   */
  getNextWorkout(): { programName: string; dayName: string; daysPerWeek: number; exercisesCount: number; targetMuscles: string[] } {
    const active = this.getActiveProgram();
    if (!active || active.days.length === 0) {
      return {
        programName: 'Push / Pull / Legs',
        dayName: 'Pull Day',
        daysPerWeek: 5,
        exercisesCount: 4,
        targetMuscles: ['Back', 'Biceps']
      };
    }

    const state = db.getState();
    const lastSession = state.workoutSessions
      .filter(s => !s.deleted_at)
      .sort((a, b) => b.started_at - a.started_at)[0];

    let nextDayIndex = 0;
    if (lastSession) {
      const lastDayIndex = active.days.findIndex(d => 
        lastSession.name.toLowerCase().includes(d.name.toLowerCase().slice(0, 4))
      );
      if (lastDayIndex >= 0) {
        nextDayIndex = (lastDayIndex + 1) % active.days.length;
      }
    }

    const nextDay = active.days[nextDayIndex] || active.days[0];

    return {
      programName: active.name,
      dayName: nextDay.name,
      daysPerWeek: active.days_per_week,
      exercisesCount: nextDay.exercises.length,
      targetMuscles: nextDay.target_muscle_groups,
    };
  }
};
