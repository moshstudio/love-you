export interface Album {
  id: string;
  title: string;
  description?: string;
  customText?: string | null;
}

export interface Photo {
  id: string;
  url: string;
  caption?: string;
}
