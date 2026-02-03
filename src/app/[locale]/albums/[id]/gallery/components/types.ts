export interface Album {
  id: string;
  title: string;
  description?: string;
}

export interface Photo {
  id: string;
  url: string;
  caption?: string;
}
