import { useTranslation } from 'react-i18next';
import { cn } from "@/lib/utils";

const TAG_CATEGORIES = [
  {
    label: "evolve.tagCategories.length",
    tags: [
      { id: "shorter", labelKey: "evolve.tags.shorter" },
      { id: "longer", labelKey: "evolve.tags.longer" },
    ]
  },
  {
    label: "evolve.tagCategories.tone",
    tags: [
      { id: "bolder", labelKey: "evolve.tags.bolder" },
      { id: "softer", labelKey: "evolve.tags.softer" },
      { id: "professional", labelKey: "evolve.tags.professional" },
      { id: "casual", labelKey: "evolve.tags.casual" },
      { id: "provocative", labelKey: "evolve.tags.provocative" },
      { id: "informative", labelKey: "evolve.tags.informative" },
    ]
  },
  {
    label: "evolve.tagCategories.structure",
    tags: [
      { id: "different_opening", labelKey: "evolve.tags.differentOpening" },
      { id: "stronger_ending", labelKey: "evolve.tags.strongerEnding" },
      { id: "add_hook", labelKey: "evolve.tags.addHook" },
      { id: "simplify", labelKey: "evolve.tags.simplify" },
    ]
  }
];

export default function EvolveQuickTags({ selectedTags = [], onTagsChange }) {
  const { t } = useTranslation();

  const toggleTag = (tagId) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter(id => id !== tagId));
    } else {
      if (selectedTags.length >= 3) return;
      onTagsChange([...selectedTags, tagId]);
    }
  };

  return (
    <div className="space-y-2">
      {TAG_CATEGORIES.map((category) => (
        <div key={category.label}>
          <p className="text-[11px] text-muted-foreground mb-1">{t(category.label)}</p>
          <div className="flex flex-wrap gap-2 overflow-x-auto">
            {category.tags.map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              const isDisabled = !isSelected && selectedTags.length >= 3;
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  disabled={isDisabled}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all border whitespace-nowrap",
                    isSelected
                      ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                      : isDisabled
                        ? "bg-secondary/30 border-transparent text-muted-foreground/40 cursor-not-allowed"
                        : "bg-secondary/50 border-transparent text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  )}
                >
                  {t(tag.labelKey)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {selectedTags.length >= 3 && (
        <p className="text-[10px] text-violet-400/70">{t('evolve.maxTags')}</p>
      )}
    </div>
  );
}
