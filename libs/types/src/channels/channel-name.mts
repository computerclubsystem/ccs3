const CHANNEL_NAME_PREFIX = 'ccs3/';

export const enum ChannelName {
    shared = `${CHANNEL_NAME_PREFIX}shared`,
    devices = `${CHANNEL_NAME_PREFIX}devices`,
    operators = `${CHANNEL_NAME_PREFIX}operators`,
}
