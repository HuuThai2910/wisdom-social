import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    ScrollView,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CreatePostScreen() {
    const router = useRouter();
    const [caption, setCaption] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800'
    );

    const handlePost = () => {
        Alert.alert('Success', 'Post created successfully!');
        router.back();
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="close" size={28} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Post</Text>
                <TouchableOpacity onPress={handlePost}>
                    <Text style={styles.postButton}>Post</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {selectedImage && (
                    <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                )}

                <TouchableOpacity style={styles.selectImageButton}>
                    <Ionicons name="images-outline" size={24} color="#3B82F6" />
                    <Text style={styles.selectImageText}>Select Photo</Text>
                </TouchableOpacity>

                <TextInput
                    style={styles.captionInput}
                    placeholder="Write a caption..."
                    value={caption}
                    onChangeText={setCaption}
                    multiline
                    numberOfLines={4}
                />

                <View style={styles.options}>
                    <TouchableOpacity style={styles.optionItem}>
                        <Ionicons name="location-outline" size={24} color="#000" />
                        <Text style={styles.optionText}>Add Location</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionItem}>
                        <Ionicons name="person-outline" size={24} color="#000" />
                        <Text style={styles.optionText}>Tag People</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionItem}>
                        <Ionicons name="musical-notes-outline" size={24} color="#000" />
                        <Text style={styles.optionText}>Add Music</Text>
                    </TouchableOpacity>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#efefef',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    postButton: {
        color: '#3B82F6',
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    imagePreview: {
        width: '100%',
        height: 400,
        backgroundColor: '#f0f0f0',
    },
    selectImageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#efefef',
    },
    selectImageText: {
        color: '#3B82F6',
        fontSize: 16,
        fontWeight: '600',
    },
    captionInput: {
        padding: 16,
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
        borderBottomWidth: 1,
        borderBottomColor: '#efefef',
    },
    options: {
        padding: 16,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#efefef',
    },
    optionText: {
        fontSize: 16,
    },
});
