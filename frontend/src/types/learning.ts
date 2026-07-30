export interface LearningPath {
  id: number;
  title: string;
  description: string;
  icon: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  progress: number;
  lessons: number;
  completed: number;
  courses: Course[];
}

export interface Course {
  id: number;
  pathId: number;
  title: string;
  description: string;
  duration: string;
  completed: boolean;
  order: number;
  type: 'video' | 'article' | 'project' | 'quiz';
}

export interface Project {
  id: number;
  title: string;
  description: string;
  githubUrl?: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  technologies: string[];
  completed: boolean;
}

export interface ProgressStats {
  enrolledTracks: number;
  lessonsCompleted: number;
  practiceHours: number;
  achievements: number;
}
