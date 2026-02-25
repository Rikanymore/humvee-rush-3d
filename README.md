# Humvee Rush 3D 🚙

Bilgisayar programcılığı bölümü öğrencisi olarak, React Three Fiber ve tarayıcı tabanlı 3D fizik motorlarının nasıl çalıştığını öğrenmek/pratik yapmak amacıyla geliştirdiğim sonsuz koşu (endless runner) oyunudur.

🎮 **Oyunu Canlı Oyna:** [https://codeoguz-humvee-rush.netlify.app/] 

## 📌 Projenin Amacı ve Öğrenim Çıktıları
Sadece bir oyun yapmaktan ziyade, web ortamında 3D objelerin optimizasyonunu ve performansını anlamak istedim. Projede özellikle dikkat ettiğim teknik kısımlar:
* **Object Pooling (Nesne Havuzu):** Oyunun sonsuz hissettirmesi için sürekli yeni yol ve engel render etmek yerine, kameranın arkasında kalan engelleri alıp arabanın önüne ışınlayan bir döngü algoritması kurdum. Bu sayede oyun hiç kasmadan saniyede 60 FPS çalışabiliyor.
* **Fizik ve Çarpışma (Hitbox):** 3D modellerin görünmez kutular (CuboidCollider) ile sarılıp Rapier fizik motoruyla çarpışma testine sokulması.
* **Responsive Control:** Oyunun hem klavye (Event Listeners) hem de mobil dokunmatik ekranlar (Pointer Events & DispatchEvent) ile sorunsuz oynanabilmesi.

## ⚙️ Kullanılan Teknolojiler
* **React (Vite):** Altyapı ve state yönetimi
* **@react-three/fiber & @react-three/drei:** Three.js'in React ekosisteminde kullanımı
* **@react-three/rapier:** 3D Fizik ve çarpışma motoru
* **Three.js:** Duman/Toz parçacık efektleri ve materyal yönetimi
* **localStorage:** Tarayıcı bazlı rekor (High Score) kayıt sistemi

## 🕹️ Nasıl Oynanır?
* **Bilgisayarda:** Sağ ve Sol yön tuşları ile engellerden kaçın.
* **Telefonda:** Ekranın sağ ve sol alt köşelerinde beliren dokunmatik butonları kullanın.
* Hızınız, skorunuz arttıkça dinamik olarak artar (Dynamic Difficulty).

## 💻 Bilgisayarında Çalıştırmak İsteyenler İçin
Eğer kodları indirip kendi bilgisayarınızda kurcalamak isterseniz:

1. Projeyi bilgisayarınıza klonlayın:
git clone [https://github.com/Rikanymore/humvee-rush-3d.git](https://github.com/Rikanymore/humvee-rush-3d.git)

2.Klasöre girip kütüphaneleri yükleyin:
npm install

3. Geliştirici sunucusunu başlatın:
npm run dev

(Modeller ve ses dosyaları public klasörünün içindedir.)

   
