export type TeamRole = 'owner' | 'admin' | 'uploader' | 'viewer';
export type FilmStatus = 'uploading' | 'ready' | 'archived' | 'failed';
export type FilmEventType = 'upload' | 'view' | 'download' | 'recording';
export type FilmAssetKind = 'video' | 'subtitle' | 'thumbnail';

export type Team = {
  id: string;
  name: string;
  slug: string;
  role: TeamRole;
  created_at: string;
};

export type FilmAsset = {
  id: string;
  film_id: string;
  kind: FilmAssetKind;
  status: FilmStatus;
  quality_label: string | null;
  language_code: string | null;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type GameFilm = {
  id: string;
  team_id: string;
  title: string;
  opponent: string | null;
  game_date: string | null;
  venue: string | null;
  competition_level: string | null;
  status: FilmStatus;
  download_enabled: boolean;
  original_filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  duration_seconds: number | null;
  view_count: number;
  download_count: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  last_viewed_at: string | null;
  assets: FilmAsset[];
};

export type NotificationRecipient = {
  id: string;
  team_id: string;
  email: string;
  events: FilmEventType[];
  enabled: boolean;
  created_at: string;
};

export type SignedUploadTarget = {
  path: string;
  token: string;
  signedUrl: string;
  bucket: string;
  assetId?: string;
};

export type SignedPlaybackResponse = {
  signedUrl: string;
  expiresIn: number;
  film: GameFilm;
  selectedQuality: string;
  subtitles: Array<{
    id: string;
    src: string;
    languageCode: string;
    label: string;
  }>;
};
