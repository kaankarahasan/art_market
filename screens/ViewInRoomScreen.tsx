/**
 * ViewInRoomScreen.tsx - Perfect Ratio & 5M Reference Scaling
 */
import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../routes/types';
import Ionicons from 'react-native-vector-icons/Ionicons';

// --- AYARLANABİLİR PARAMETRELER ---
// Arka plan resminizin kendi Orijinal Çözünürlüğü (Bozulmaları önlemek için okundu)
const IMG_WIDTH = 2816;
const IMG_HEIGHT = 1536;
const IMG_ASPECT = IMG_WIDTH / IMG_HEIGHT;

// Saksı ve Lambader arasındaki mesafe (cm)
const REFERENCE_DISTANCE_CM = 500; 

// Saksı ve Lambader'in resim içindeki X ekseni koordinatları (0.0 sol köşe, 1.0 sağ köşe)
// Resmi göz kararı kontrol ederek bu değerlerle aynen oynayabilirsiniz:
const LEFT_OBJECT_X_PCT = 0.15;  // Örn: Soldaki lambader
const RIGHT_OBJECT_X_PCT = 0.85; // Örn: Sağdaki saksı
// ----------------------------------

type ViewInRoomRouteProp = RouteProp<RootStackParamList, 'ViewInRoom'>;

const ViewInRoomScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<ViewInRoomRouteProp>();
  const { imageUrl, dimensions } = route.params;
  
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // 1. Ekran boyutuna göre arka plan resminin "tam sığacak" (contain) ama "boşluksuz çerçevenin" piksellerini bulalım
  const screenAspect = screenWidth / screenHeight;
  let renderWidth = screenWidth;
  let renderHeight = screenHeight;

  if (screenAspect > IMG_ASPECT) {
    // Ekran resimden daha genişse (resmin yanlarında boşluk kalır) -> Boyut yüksekliğe kilitlenir
    renderHeight = screenHeight;
    renderWidth = renderHeight * IMG_ASPECT;
  } else {
    // Ekran resimden daha darsa (resmin alt/üstünde boşluk kalır) -> Boyut genişliğe kilitlenir
    renderWidth = screenWidth;
    renderHeight = renderWidth / IMG_ASPECT;
  }

  // 2. Piksel -> CM oranını saksı/lambader arasına göre kur (Sadece Görünen Genişlik Üzerinden)
  const pixelDistance = renderWidth * (RIGHT_OBJECT_X_PCT - LEFT_OBJECT_X_PCT);
  const pixelsPerCm = pixelDistance / REFERENCE_DISTANCE_CM;

  // 3. Eserin boyutlarını piksele çevir (Varsayılan 60x80)
  const artworkWidthCm = dimensions?.width || 60;
  const artworkHeightCm = dimensions?.height || (dimensions?.width ? dimensions.width : 80);

  const artworkWidthPx = artworkWidthCm * pixelsPerCm;
  const artworkHeightPx = artworkHeightCm * pixelsPerCm;

  // 4. İki objenin tam merkezi X koordinatını hesapla
  const centerX_PCT = (LEFT_OBJECT_X_PCT + RIGHT_OBJECT_X_PCT) / 2;

  // X ekseninde merkezde, Y ekseninde ise resmin genelde göz hizası olan hafif yukarısında (%40)
  const artworkLeftPx = (renderWidth * centerX_PCT) - (artworkWidthPx / 2);
  const artworkTopPx = (renderHeight * 0.40) - (artworkHeightPx / 2); 

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      {/* Resmin tam sınırlarına oturan kapsayıcı "Kutu", resizeMode: contain olan resmin asıl bulunduğu alanı simüle eder */}
      <View style={{ width: renderWidth, height: renderHeight, overflow: 'hidden' }}>
        
        {/* view_in_room_final.png - Cache'i kırmak ve yenilemek için ismini final yaptım */}
        <Image
          source={require('../assets/view_in_room_final.png')}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover" 
        />

        {/* Eser Katmanı - Tam milimetrik matematik hesabı lokasyonu */}
        <View 
          style={{
            position: 'absolute',
            left: artworkLeftPx,
            top: artworkTopPx,
            width: artworkWidthPx,
            height: artworkHeightPx,
          }}
          pointerEvents="none"
        >
          <Image
            source={{ uri: imageUrl }}
            style={styles.artworkImage}
            resizeMode="contain"
          />
          <View style={styles.artworkShadow} />
        </View>

      </View>

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
      </View>

    </View>
  );
};

export default ViewInRoomScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
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
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 20,
    zIndex: 1,
  },
});
