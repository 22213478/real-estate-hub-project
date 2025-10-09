// js/app-init.js

// 모듈 import
import { propertyService, fetchPropertyList } from '../../shared/services/property-service.js';
import { toCardModel } from '../../shared/services/property-adapter.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM 요소 ---
    const propertyList = document.getElementById("property-list");
    const recommendedList = document.getElementById("recommended-list");
    const favoriteList = document.getElementById("favorite-list");
    const compareList = document.getElementById("compare-list");
    const notificationList = document.getElementById("notification-list");
    const chatListContainer = document.getElementById("chat-list");
    const profilePanel = document.getElementById("profile-panel");

  // --- 내 매물 관리 스크립트는 이미 loginO.html에서 로드됨 ---
  // property-management.js는 loginO.html의 <script src="js/regular/main/property-management.js"></script>에서 이미 로드됨

  // --- 데이터 렌더링 함수 ---

  // 알림 렌더링 - notification-management.js에서 처리
  function renderNotifications() {
    if (window.notificationManagement) {
      window.notificationManagement.loadNotifications();
    }
  }
  // 다른 스크립트(panel-manager.js)에서 호출할 수 있도록 window 객체에 할당
  window.renderNotifications = renderNotifications;

  // 즐겨찾기 매물 렌더링
  function renderFavoriteProperties() {
    if (
      !favoriteList ||
      typeof favoriteProperties === "undefined" ||
      typeof createFavoritePropertyCard !== "function"
    )
      return;
    favoriteList.innerHTML = "";
    favoriteProperties.forEach((property) => {
      favoriteList.innerHTML += createFavoritePropertyCard(property);
    });
  }
  window.renderFavoriteProperties = renderFavoriteProperties;

  // 비교 그룹 렌더링
  function renderCompareGroups() {
    if (
      !compareList ||
      typeof compareGroups === "undefined" ||
      typeof createCompareCard !== "function"
    )
      return;
    compareList.innerHTML = "";
    compareGroups.forEach((group) => {
      const itemsHTML = group.items.map(createCompareCard).join("");
      const groupHTML = `
                <div class="bg-gray-50 border rounded-lg p-3">
                    <div class="flex items-center justify-between mb-2">
                        <p class="text-sm font-semibold text-gray-700">그룹 #${group.groupId}</p>
                        <div class="text-[11px] text-gray-500">매물 ${group.items.length}개</div>
                    </div>
                    <div class="flex flex-col gap-3">
                        ${itemsHTML}
                    </div>
                </div>
            `;
      compareList.innerHTML += groupHTML;
    });
  }
  window.renderCompareGroups = renderCompareGroups;

  // 채팅 목록 렌더링
  function renderChatList(data) {
    if (
      !chatListContainer ||
      typeof chatData === "undefined" ||
      typeof createChatCard !== "function"
    )
      return;
    const chatsToRender = data || chatData;
    chatListContainer.innerHTML = "";
    chatsToRender.forEach((chat) => {
      chatListContainer.innerHTML += createChatCard(chat);
    });
  }
  window.renderChatList = renderChatList;

  // 채팅 검색 초기화
  function initializeChatSearch() {
    const searchInput = document.querySelector(
      '#chat-panel input[placeholder="채팅방 검색"]'
    );
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (typeof chatData !== "undefined") {
          const filteredChats = chatData.filter(
            (chat) =>
              chat.name.toLowerCase().includes(searchTerm) ||
              chat.lastMessage.toLowerCase().includes(searchTerm) ||
              chat.property.toLowerCase().includes(searchTerm)
          );
          renderChatList(filteredChats);
        }
      });
    }
  }
  window.initializeChatSearch = initializeChatSearch;

  // --- 패널 내부 기능 및 이벤트 리스너 ---

  // 알림: 모든 알림 읽음 처리
  document
    .getElementById("mark-all-read-button")
    ?.addEventListener("click", () => {
      if (window.notificationManagement) {
        window.notificationManagement.markAllAsRead();
      }
    });

  // 비교: 새 그룹 추가
  document
    .getElementById("add-compare-group-button")
    ?.addEventListener("click", () => {
      if (typeof compareGroups !== "undefined") {
        const newGroupId =
          compareGroups.length > 0
            ? Math.max(...compareGroups.map((g) => g.groupId)) + 1
            : 1;
        compareGroups.push({ groupId: newGroupId, items: [] });
        renderCompareGroups();
      }
    });

  // 내 매물: 새 매물 등록
  document
    .getElementById("add-new-property-button")
    ?.addEventListener("click", () => {
      alert("새 매물 등록 페이지로 이동합니다.");
    });

  // 프로필 패널 기능
  if (profilePanel) {
    profilePanel
      .querySelector('button[type="button"]')
      ?.addEventListener("click", () => {
        document.getElementById("profile-image-input")?.click();
      });

    document
      .getElementById("profile-image-input")
      ?.addEventListener("change", function (e) {
        if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const profileImage = document.getElementById("profile-image");
            if (profileImage) profileImage.src = event.target.result;
          };
          reader.readAsDataURL(e.target.files[0]);
        }
      });

    document
      .getElementById("profile-form")
      ?.addEventListener("submit", function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        const profileData = Object.fromEntries(formData.entries());
        console.log("프로필 업데이트:", profileData);
        alert("프로필이 성공적으로 업데이트되었습니다.");
      });
  }

  // --- 기타 이벤트 리스너 ---

  // 로그아웃 버튼
  const logoutButton = document.getElementById("logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      if (confirm("로그아웃 하시겠습니까?")) {
        // AuthUtils를 사용하여 모든 토큰 관련 데이터 제거
        if (typeof AuthUtils !== "undefined" && AuthUtils.removeToken) {
          AuthUtils.removeToken();
        } else {
          // Fallback: AuthUtils가 로드되지 않은 경우
          localStorage.removeItem("accessToken");
          localStorage.removeItem("access_token");
          sessionStorage.removeItem("accessToken");
          sessionStorage.removeItem("access_token");
        }
        // refreshToken도 제거
        localStorage.removeItem("refreshToken");
        sessionStorage.removeItem("refreshToken");

        // 로그인 페이지로 리다이렉트
        window.location.href = "/loginX.html";
      }
    });
  }

    // --- DB에서 매물 목록 로드 및 렌더링 ---
    async function loadAndRenderProperties() {
        try {
            console.log('DB에서 매물 목록을 로드하는 중...');
            
            // DB에서 매물 목록 조회
            const propertyDtos = await fetchPropertyList({
                page: 0,
                size: 20,
                sort: 'createdAt,desc',
                status: 'AVAILABLE'
            });
            
            console.log('로드된 매물 수:', propertyDtos.length);
            
            if (propertyDtos.length === 0) {
                console.log('매물이 없습니다. 더미 데이터를 사용합니다.');
                // 더미 데이터로 폴백
                if (typeof properties !== 'undefined' && typeof createPropertyCard === 'function') {
                    properties.forEach((prop) => {
                        const cardHTML = createPropertyCard(prop);
                        if (prop.isRecommended) {
                            recommendedList.innerHTML += cardHTML;
                        } else {
                            propertyList.innerHTML += cardHTML;
                        }
                    });
                }
                return;
            }
            
            // offers가 있는 매물만 필터링 (offers가 없으면 거래 불가능)
            const validProperties = propertyDtos.filter(property => 
                property.offers && property.offers.length > 0
            );
            
            console.log(`유효한 매물 수: ${validProperties.length} (전체: ${propertyDtos.length})`);
            
            if (validProperties.length === 0) {
                console.log('거래 가능한 매물이 없습니다. 더미 데이터를 사용합니다.');
                // 더미 데이터로 폴백
                if (typeof properties !== 'undefined' && typeof createPropertyCard === 'function') {
                    properties.forEach((prop) => {
                        const cardHTML = createPropertyCard(prop);
                        if (prop.isRecommended) {
                            recommendedList.innerHTML += cardHTML;
                        } else {
                            propertyList.innerHTML += cardHTML;
                        }
                    });
                }
                return;
            }
            
            // DB 데이터를 카드 모델로 변환
            const cardModels = validProperties.map(toCardModel);
            
            // 카드 렌더링
            if (propertyList && recommendedList && typeof createPropertyCard === 'function') {
                // 기존 내용 초기화
                propertyList.innerHTML = '';
                recommendedList.innerHTML = '';
                
                cardModels.forEach((prop) => {
                    const cardHTML = createPropertyCard(prop);
                    if (prop.isRecommended) {
                        recommendedList.innerHTML += cardHTML;
                    } else {
                        propertyList.innerHTML += cardHTML;
                    }
                });
                
                console.log('매물 카드 렌더링 완료');
            }
            
        } catch (error) {
            console.error('매물 목록 로드 실패:', error);
            
            // 에러 시 더미 데이터로 폴백
            if (typeof properties !== 'undefined' && typeof createPropertyCard === 'function') {
                console.log('더미 데이터로 폴백합니다.');
                properties.forEach((prop) => {
                    const cardHTML = createPropertyCard(prop);
                    if (prop.isRecommended) {
                        recommendedList.innerHTML += cardHTML;
                    } else {
                        propertyList.innerHTML += cardHTML;
                    }
                });
            }
        }
    }

    // --- 초기 렌더링 ---
    function initialRender() {
        // DB에서 매물 목록 로드
        loadAndRenderProperties();
    }

  initialRender();
});
