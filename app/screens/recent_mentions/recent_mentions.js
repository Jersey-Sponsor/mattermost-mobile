// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    DeviceEventEmitter,
    FlatList,
    StyleSheet,
    View,
} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';

import {dismissModal} from '@actions/navigation';
import ChannelLoader from '@components/channel_loader';
import DateSeparator from '@components/post_list/date_separator';
import FailedNetworkAction from '@components/failed_network_action';
import NoResults from '@components/no_results';
import PostSeparator from '@components/post_separator';
import StatusBar from '@components/status_bar';
import {isDateLine, getDateForDateLine} from '@mm-redux/utils/post_list';
import SearchResultPost from '@screens/search/search_result_post';
import ChannelDisplayName from '@screens/search/channel_display_name';

export default class RecentMentions extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            clearSearch: PropTypes.func.isRequired,
            getRecentMentions: PropTypes.func.isRequired,
        }).isRequired,
        postIds: PropTypes.array,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        postIds: [],
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        props.actions.clearSearch();
        this.state = {
            didFail: false,
            isLoading: false,
        };
    }

    getRecentMentions = async () => {
        const {actions} = this.props;

        this.setState({isLoading: true});
        const {error} = await actions.getRecentMentions();

        this.setState({
            isLoading: false,
            didFail: Boolean(error),
        });
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);

        this.getRecentMentions();
    }

    setListRef = (ref) => {
        this.listRef = ref;
    }

    keyExtractor = (item) => item;

    navigationButtonPressed({buttonId}) {
        if (buttonId === 'close-settings') {
            dismissModal();
        }
    }

    onViewableItemsChanged = ({viewableItems}) => {
        if (!viewableItems.length) {
            return;
        }

        const viewableItemsMap = viewableItems.reduce((acc, {item, isViewable}) => {
            if (isViewable) {
                acc[item] = true;
            }
            return acc;
        }, {});

        DeviceEventEmitter.emit('scrolled', viewableItemsMap);
    };

    renderEmpty = () => {
        const {formatMessage} = this.context.intl;
        const {theme} = this.props;

        return (
            <NoResults
                description={formatMessage({
                    id: 'mobile.recent_mentions.empty_description',
                    defaultMessage: 'Messages where someone mentions you or includes your trigger words are saved here.',
                })}
                iconName='at'
                title={formatMessage({id: 'mobile.recent_mentions.empty_title', defaultMessage: 'No Mentions yet'})}
                theme={theme}
            />
        );
    };

    renderPost = ({item, index}) => {
        const {postIds, theme} = this.props;

        if (isDateLine(item)) {
            return (
                <DateSeparator
                    date={getDateForDateLine(item)}
                    theme={theme}
                />
            );
        }

        let separator;
        const nextPost = postIds[index + 1];
        if (nextPost && !isDateLine(nextPost)) {
            separator = <PostSeparator theme={theme}/>;
        }

        return (
            <View>
                <ChannelDisplayName postId={item}/>
                <SearchResultPost
                    postId={item}
                    skipPinnedHeader={true}
                    theme={theme}
                />
                {separator}
            </View>
        );
    };

    retry = () => {
        this.getRecentMentions();
    };

    render() {
        const {postIds, theme} = this.props;
        const {didFail, isLoading} = this.state;

        let component;
        if (didFail) {
            component = (
                <FailedNetworkAction
                    onRetry={this.retry}
                    theme={theme}
                />
            );
        } else if (isLoading) {
            component = (
                <ChannelLoader channelIsLoading={true}/>
            );
        } else if (postIds.length) {
            component = (
                <FlatList
                    ref={this.setListRef}
                    contentContainerStyle={style.sectionList}
                    data={postIds}
                    keyExtractor={this.keyExtractor}
                    keyboardShouldPersistTaps='always'
                    keyboardDismissMode='interactive'
                    removeClippedSubviews={true}
                    renderItem={this.renderPost}
                    onViewableItemsChanged={this.onViewableItemsChanged}
                />
            );
        } else {
            component = this.renderEmpty();
        }

        return (
            <SafeAreaView
                testID='recent_mentions.screen'
                style={style.container}
            >
                <StatusBar/>
                {component}
            </SafeAreaView>
        );
    }
}

const style = StyleSheet.create({
    container: {
        flex: 1,
    },
});
