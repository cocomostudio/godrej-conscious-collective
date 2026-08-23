
/**
 |
 | Populate fragment for `media.image-v1`.
 |
 | The media file is the one thing here that has to be reached for. `url` is a
 | plain string beside it — an address to load from when no file was uploaded,
 | which is what the seed script uses so that no image is stored in this
 | repository.
 |
 */

export const populate_image_v1 = {
	file: true,
}
