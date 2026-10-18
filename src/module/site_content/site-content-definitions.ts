export type ContentDefinition = {
  page: string;
  blockKey: string;
  blockType: string;
  supportsOrder: boolean;
  supportsMedia: boolean;
  dataFields: readonly string[];
};

export const contentDefinitions = [
  {
    page: 'home',
    blockKey: 'hero-carousel',
    blockType: 'carousel-slide',
    supportsOrder: true,
    supportsMedia: true,
    dataFields: ['title_1', 'title_2', 'subtitle'],
  },
  {
    page: 'home',
    blockKey: 'statistic',
    blockType: 'statistic-item',
    supportsOrder: true,
    supportsMedia: false,
    dataFields: ['label', 'number', 'description'],
  },
  {
    page: 'home',
    blockKey: 'teaser',
    blockType: 'teaser-title',
    supportsOrder: false,
    supportsMedia: false,
    dataFields: ['title'],
  },
  {
    page: 'home',
    blockKey: 'teaser',
    blockType: 'cta-title',
    supportsOrder: false,
    supportsMedia: false,
    dataFields: ['title'],
  },
  {
    page: 'home',
    blockKey: 'teaser',
    blockType: 'teaser-content',
    supportsOrder: false,
    supportsMedia: false,
    dataFields: ['content'],
  },
  {
    page: 'about-us',
    blockKey: 'company-profile',
    blockType: 'profile-content',
    supportsOrder: false,
    supportsMedia: false,
    dataFields: ['content'],
  },
  {
    page: 'about-us',
    blockKey: 'company-profile',
    blockType: 'company-picture',
    supportsOrder: false,
    supportsMedia: true,
    dataFields: [],
  },
  {
    page: 'about-us',
    blockKey: 'mission-vision',
    blockType: 'vision',
    supportsOrder: false,
    supportsMedia: false,
    dataFields: ['content'],
  },
  {
    page: 'about-us',
    blockKey: 'mission-vision',
    blockType: 'mission-item',
    supportsOrder: true,
    supportsMedia: false,
    dataFields: ['title', 'description'],
  },
  {
    page: 'about-us',
    blockKey: 'history_timeline',
    blockType: 'timeline-item',
    supportsOrder: true,
    supportsMedia: false,
    dataFields: ['period', 'description'],
  },
] as const satisfies readonly ContentDefinition[];

export function findContentDefinition(
  page: string,
  blockKey: string,
  blockType: string,
): ContentDefinition | undefined {
  return contentDefinitions.find(
    (definition) =>
      definition.page === page &&
      definition.blockKey === blockKey &&
      definition.blockType === blockType,
  );
}
