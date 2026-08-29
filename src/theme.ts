/** One colour per team slot, used for the scoreboard, turn banner and tags. */
export const TEAM_COLORS = ['#ffc046', '#4dc3ff', '#35d0a5', '#ff7bd0', '#a78bfa']

export const teamColor = (index: number): string => TEAM_COLORS[index % TEAM_COLORS.length]
