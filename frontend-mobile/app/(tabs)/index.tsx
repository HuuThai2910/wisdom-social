import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { mockPosts, mockStories } from '../../constants/mockData';
import PostCard from '../../components/post/PostCard';

export default function FeedScreen() {
    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
               

                <View style={styles.postsContainer}>
                    {mockPosts.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    postsContainer: {
        paddingTop: 8,
    },
});
