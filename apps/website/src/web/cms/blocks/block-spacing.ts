
/**
 |
 | The gap a block leaves around itself.
 |
 | One string in one place, because every leaf and composite in the catalogue
 | uses it and a section's children are a mixed bag of them — a block that
 | spaced itself differently would read as a mistake rather than as a choice.
 |
 | It collapses at the ends: a block that opens or closes a region leaves the
 | outer gap to whatever contains it, which for a section is padding.
 |
 */

export const BLOCK_SPACING = "my-6 md:my-8 first:mt-0 last:mb-0"
