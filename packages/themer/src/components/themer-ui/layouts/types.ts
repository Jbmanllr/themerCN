/** What ThemerUI passes to every desktop Themer layout component. */
export interface ThemerLayoutProps {
  /** Closes the Themer UI. */
  onClose: () => void;
  /** The Themer UI's layer (`config.zIndex`, else Z_INDEX.sidebar). */
  zIndex: number;
}
