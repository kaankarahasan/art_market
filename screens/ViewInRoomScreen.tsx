import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../routes/types';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Odadaki bank veya duvarın temsil edilen toplam genişliği (cm cinsinden örnek değer)
// YATAY modda ekran daha geniş olacağı için referans duvar genişliğini de daha geniş tutuyoruz.
const ROOM_WALL_WIDTH_CM = 450;

type ViewInRoomRouteProp = RouteProp<RootStackParamList, 'ViewInRoom'>;

const ViewInRoomScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<ViewInRoomRouteProp>();
  const { imageUrl, dimensions } = route.params;
  
  // useWindowDimensions ile ekran yatay/dikey dönüşünü otomatik yakalarız.
  const { width } = useWindowDimensions();

  // Gerçek dünya ölçülerini (cm) ekrandaki piksellere dönüştürme oranı
  const pixelsPerCm = width / ROOM_WALL_WIDTH_CM;

  // Eserin boyutları. Gittiği veride ölçü yoksa varsayılan olarak 60x80 cm kabul edelim.
  const artworkWidthCm = dimensions?.width || 60;
  const artworkHeightCm = dimensions?.height || (dimensions?.width ? dimensions.width : 80);

  const calculatedPixelWidth = artworkWidthCm * pixelsPerCm;
  const calculatedPixelHeight = artworkHeightCm * pixelsPerCm;

  return (
    <View style={styles.container}>
      {/* Arka Plan Oda Görseli (Ekrana tam sığdırıldı) */}
      <View style={StyleSheet.absoluteFillObject}>
        <Image
          source={require('../assets/view_in_room_fixed.png')}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      </View>

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>
          Eser gerçek boyutlarına ({artworkWidthCm}x{artworkHeightCm} cm) uygun olarak hizalandı.
        </Text>
      </View>

      {/* Sabit ve Orantılı Eser Görseli */}
      {/* pointerEvents none yaparak sürüklenme veya dokunmaları devre dışı bırakıyoruz */}
      <View style={styles.overlayContainer} pointerEvents="none">
        <View
          style={{
            width: calculatedPixelWidth,
            height: calculatedPixelHeight,
            justifyContent: 'center',
            alignItems: 'center',
            // Eğer referans resmin tam ortasını değil biraz yukarısını istiyorsanız translateY eklenebilir:
            // transform: [{ translateY: -20 }] 
          }}
        >
          <Image
            source={{ uri: imageUrl }}
            style={styles.artworkImage}
            resizeMode="contain" // Orijinal görsel kırpılmadan sığdırılır
          />
          {/* Gölgelendirme Efekti */}
          <View style={styles.artworkShadow} />
        </View>
      </View>
    </View>
  );
};

export default ViewInRoomScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 25 : 20, 
    left: 20,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 25, // Yatay ekranda instruction metnini alta almak daha temiz bir görünüm yaratır
    alignSelf: 'center',
    padding: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
  },
  instructionText: {
    color: 'white',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  artworkShadow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
    zIndex: 1,
  },
});
